"""
AST Parser — Deep structural analysis of student code (multi-language).

This is the SYMBOLIC half of the NS-CITS architecture.
Pure analysis, no LLM calls, no async, no external API dependencies.

Supported languages: Python, Java, C++, JavaScript  (via Tree-sitter)

Detects:
  - Algorithm patterns (recursive, iterative, DP, two-pointer, BFS/DFS, brute-force)
  - Data structures (list, dict, set, stack, queue, linked list, tree)
  - Code issues with exact line numbers and Socratic suggestions
  - Function profiles (recursion, base case, return, loops)
  - Curriculum concept mapping
  - Syntax errors via Tree-sitter ERROR nodes

v3.0 — Rewritten with Tree-sitter for multi-language support.
"""
import ast as python_ast          # kept for Python security checks
import re
from typing import Dict, List, Optional, Any, Tuple, Set

from pydantic import BaseModel, Field
from enum import Enum

# Tree-sitter
from tree_sitter import Language, Parser, Node
import tree_sitter_python as _ts_python
import tree_sitter_java as _ts_java
import tree_sitter_cpp as _ts_cpp
import tree_sitter_javascript as _ts_js

from app.core.config import get_settings


# ═══════════════════════════════════════════════════════════════
#  TREE-SITTER LANGUAGES (singletons)
# ═══════════════════════════════════════════════════════════════

_LANGUAGES: Dict[str, Language] = {
    "python":     Language(_ts_python.language()),
    "java":       Language(_ts_java.language()),
    "cpp":        Language(_ts_cpp.language()),
    "javascript": Language(_ts_js.language()),
}

# Mapping from various names to canonical language key
_LANG_ALIASES: Dict[str, str] = {
    "python": "python", "python3": "python", "py": "python",
    "java": "java",
    "cpp": "cpp", "c++": "cpp", "cpp17": "cpp", "cpp14": "cpp",
    "javascript": "javascript", "js": "javascript", "nodejs": "javascript",
}


# ═══════════════════════════════════════════════════════════════
#  ENUMS
# ═══════════════════════════════════════════════════════════════

class CodeIssue(Enum):
    SYNTAX_ERROR = "syntax_error"
    INFINITE_LOOP = "infinite_loop"
    MISSING_RETURN = "missing_return"
    UNUSED_VARIABLE = "unused_variable"
    NO_TERMINATION = "no_termination"
    EMPTY_FUNCTION = "empty_function"
    MISSING_BASE_CASE = "missing_base_case"
    WRONG_RETURN_TYPE = "wrong_return_type"
    OFF_BY_ONE = "off_by_one"
    SHADOWED_VARIABLE = "shadowed_variable"
    WRONG_ALGORITHM = "wrong_algorithm"
    INEFFICIENT_SOLUTION = "inefficient_solution"


class AlgorithmPattern(Enum):
    RECURSIVE = "recursive"
    ITERATIVE = "iterative"
    DIVIDE_CONQUER = "divide_conquer"
    DYNAMIC_PROG = "dp"
    TWO_POINTER = "two_pointer"
    SLIDING_WINDOW = "sliding_window"
    BFS_DFS = "bfs_dfs"
    BRUTE_FORCE = "brute_force"
    UNKNOWN = "unknown"


# ═══════════════════════════════════════════════════════════════
#  SECURITY
# ═══════════════════════════════════════════════════════════════

class SecurityException(Exception):
    """Raised when student code contains blocked imports (os, sys, subprocess, etc.)."""
    def __init__(self, violations: List[str]):
        self.violations = violations
        super().__init__(f"Blocked imports detected: {', '.join(violations)}")


# ═══════════════════════════════════════════════════════════════
#  DATA CLASSES
# ═══════════════════════════════════════════════════════════════

class IssueLocation(BaseModel):
    """A specific issue pinpointed in the code."""
    issue_type: CodeIssue
    line: Optional[int] = None
    col: Optional[int] = None
    code_snippet: str = ""
    description: str = ""
    suggestion: str = ""       # Socratic — what to LOOK AT, not the fix


class FunctionProfile(BaseModel):
    """Deep profile of a single function."""
    name: str
    start_line: int
    param_names: List[str] = Field(default_factory=list)
    local_variables: List[str] = Field(default_factory=list)
    calls_itself: bool = False
    calls: List[str] = Field(default_factory=list)
    has_return: bool = False
    return_lines: List[int] = Field(default_factory=list)
    loop_count: int = 0
    has_base_case: bool = False
    docstring: Optional[str] = None


class ASTAnalysisResult(BaseModel):
    """Full AST analysis output — strictly typed Pydantic model."""
    is_valid: bool
    issues: List[CodeIssue] = Field(default_factory=list)
    issue_locations: List[IssueLocation] = Field(default_factory=list)
    syntax_errors: List[str] = Field(default_factory=list)
    function_count: int = 0
    loop_count: int = 0
    variable_count: int = 0
    has_recursion: bool = False
    complexity_score: int = 0
    max_nesting_depth: int = 0
    code_structure: Dict[str, Any] = Field(default_factory=dict)
    algorithm_pattern: AlgorithmPattern = AlgorithmPattern.UNKNOWN
    function_profiles: List[FunctionProfile] = Field(default_factory=list)
    data_structures_used: List[str] = Field(default_factory=list)
    concepts_detected: List[str] = Field(default_factory=list)
    student_approach_summary: str = ""
    security_violations: List[str] = Field(default_factory=list)
    lines: List[str] = Field(default_factory=list)
    language: str = "python"


# Backward-compatible alias
AnalysisResult = ASTAnalysisResult


# ═══════════════════════════════════════════════════════════════
#  TREE-SITTER WALKER — language-agnostic structural analysis
# ═══════════════════════════════════════════════════════════════

# Node type mappings per language
_FUNCTION_NODES = {
    "python":     {"function_definition"},
    "java":       {"method_declaration", "constructor_declaration"},
    "cpp":        {"function_definition"},
    "javascript": {"function_declaration", "arrow_function", "method_definition",
                   "function", "function_expression"},
}

_LOOP_NODES = {
    "python":     {"for_statement", "while_statement"},
    "java":       {"for_statement", "while_statement", "enhanced_for_statement", "do_statement"},
    "cpp":        {"for_statement", "while_statement", "for_range_loop", "do_statement"},
    "javascript": {"for_statement", "while_statement", "for_in_statement", "do_statement"},
}

_CONDITIONAL_NODES = {
    "python":     {"if_statement"},
    "java":       {"if_statement", "switch_expression"},
    "cpp":        {"if_statement", "switch_statement"},
    "javascript": {"if_statement", "switch_statement", "ternary_expression"},
}

_RETURN_NODES = {
    "python":     {"return_statement"},
    "java":       {"return_statement"},
    "cpp":        {"return_statement"},
    "javascript": {"return_statement"},
}

_VARIABLE_NODES = {
    "python":     {"assignment", "augmented_assignment"},
    "java":       {"local_variable_declaration", "field_declaration"},
    "cpp":        {"declaration", "init_declarator"},
    "javascript": {"variable_declaration", "lexical_declaration", "assignment_expression"},
}

_IMPORT_NODES = {
    "python":     {"import_statement", "import_from_statement"},
    "java":       {"import_declaration"},
    "cpp":        {"preproc_include"},
    "javascript": {"import_statement"},
}

_CALL_NODES = {
    "python":     {"call"},
    "java":       {"method_invocation"},
    "cpp":        {"call_expression"},
    "javascript": {"call_expression"},
}


def _get_node_text(node: Node, source: bytes) -> str:
    """Extract source text for a node."""
    return source[node.start_byte:node.end_byte].decode("utf-8", errors="replace")


def _find_all(root: Node, node_types: Set[str]) -> List[Node]:
    """Recursively find all descendant nodes matching any of the given types."""
    results = []
    stack = [root]
    while stack:
        node = stack.pop()
        if node.type in node_types:
            results.append(node)
        stack.extend(reversed(node.children))
    return results


def _find_children_recursive(node: Node) -> List[Node]:
    """Flatten all descendants."""
    result = []
    stack = [node]
    while stack:
        n = stack.pop()
        result.append(n)
        stack.extend(reversed(n.children))
    return result


def _get_function_name(node: Node, lang: str, source: bytes) -> str:
    """Extract the function/method name from its definition node."""
    if lang == "python":
        for child in node.children:
            if child.type == "identifier":
                return _get_node_text(child, source)
    elif lang == "java":
        for child in node.children:
            if child.type == "identifier":
                return _get_node_text(child, source)
    elif lang == "cpp":
        # C++ nests the name inside function_declarator
        for child in node.children:
            if child.type == "function_declarator":
                for cc in child.children:
                    if cc.type == "identifier":
                        return _get_node_text(cc, source)
            elif child.type == "identifier":
                return _get_node_text(child, source)
    elif lang == "javascript":
        if node.type == "arrow_function":
            # arrow functions are anonymous unless assigned
            parent = node.parent
            if parent and parent.type in ("variable_declarator", "pair"):
                for c in parent.children:
                    if c.type == "identifier" or c.type == "property_identifier":
                        return _get_node_text(c, source)
            return "<arrow>"
        for child in node.children:
            if child.type in ("identifier", "property_identifier"):
                return _get_node_text(child, source)
    return "<anonymous>"


def _get_function_params(node: Node, lang: str, source: bytes) -> List[str]:
    """Extract parameter names from a function definition node."""
    params = []
    if lang == "python":
        for child in node.children:
            if child.type == "parameters":
                for p in child.children:
                    if p.type == "identifier":
                        params.append(_get_node_text(p, source))
                    elif p.type in ("default_parameter", "typed_parameter",
                                    "typed_default_parameter"):
                        for c in p.children:
                            if c.type == "identifier":
                                params.append(_get_node_text(c, source))
                                break
    elif lang == "java":
        for child in node.children:
            if child.type == "formal_parameters":
                for p in child.children:
                    if p.type == "formal_parameter":
                        for c in p.children:
                            if c.type == "identifier":
                                params.append(_get_node_text(c, source))
    elif lang == "cpp":
        for child in node.children:
            # C++ nests params inside function_declarator > parameter_list
            if child.type == "function_declarator":
                for fc in child.children:
                    if fc.type == "parameter_list":
                        for p in fc.children:
                            if p.type == "parameter_declaration":
                                for c in p.children:
                                    if c.type == "identifier":
                                        params.append(_get_node_text(c, source))
            elif child.type == "parameter_list":
                for p in child.children:
                    if p.type == "parameter_declaration":
                        for c in p.children:
                            if c.type == "identifier":
                                params.append(_get_node_text(c, source))
    elif lang == "javascript":
        for child in node.children:
            if child.type == "formal_parameters":
                for p in child.children:
                    if p.type == "identifier":
                        params.append(_get_node_text(p, source))
                    elif p.type in ("assignment_pattern",):
                        for c in p.children:
                            if c.type == "identifier":
                                params.append(_get_node_text(c, source))
                                break
    return params


class _TreeSitterWalker:
    """
    Language-agnostic AST walker using Tree-sitter.
    Produces the same structural data as the old _DeepVisitor.
    """

    def __init__(self, root: Node, lang: str, source: bytes, lines: List[str]):
        self.root = root
        self.lang = lang
        self.source = source
        self.lines = lines

        self.function_count = 0
        self.loop_count = 0
        self.variable_count = 0
        self.conditional_count = 0
        self.recursion_count = 0
        self.nested_loop_depth = 0
        self.max_nesting_depth = 0
        self.has_return = False
        self.has_break = False
        self.has_recursion = False
        self.uses_list = False
        self.uses_dict = False
        self.uses_set = False
        self.functions: List[str] = []
        self.loops: List[str] = []
        self.variables: Set[str] = set()
        self.imported_names: Set[str] = set()
        self.while_loops: List[dict] = []
        self.function_profiles: List[FunctionProfile] = []
        self.syntax_errors: List[str] = []

        self._walk()

    # ── Main walk ────────────────────────────────────────

    def _walk(self):
        """Walk the tree and collect all structural information."""
        fn_types = _FUNCTION_NODES.get(self.lang, set())
        loop_types = _LOOP_NODES.get(self.lang, set())
        cond_types = _CONDITIONAL_NODES.get(self.lang, set())
        var_types = _VARIABLE_NODES.get(self.lang, set())
        import_types = _IMPORT_NODES.get(self.lang, set())
        call_types = _CALL_NODES.get(self.lang, set())
        return_types = _RETURN_NODES.get(self.lang, set())

        # Collect syntax errors (ERROR nodes)
        for err_node in _find_all(self.root, {"ERROR"}):
            line = err_node.start_point[0] + 1
            snippet = self.lines[line - 1].strip() if line <= len(self.lines) else ""
            self.syntax_errors.append(f"Line {line}: Syntax error near `{snippet}`")

        # Functions
        func_nodes = _find_all(self.root, fn_types)
        self.function_count = len(func_nodes)
        for fn_node in func_nodes:
            self._process_function(fn_node, fn_types, loop_types, cond_types,
                                   call_types, return_types)

        # Loops
        loop_nodes = _find_all(self.root, loop_types)
        self.loop_count = len(loop_nodes)
        for lnode in loop_nodes:
            loop_line = lnode.start_point[0] + 1
            loop_type = lnode.type.split("_")[0]  # "for", "while", "do"
            self.loops.append(f"{loop_type} (line {loop_line})")

            if "while" in lnode.type:
                # Check for break/return in while body
                descendants = _find_children_recursive(lnode)
                has_break = any(d.type == "break_statement" for d in descendants)
                has_ret = any(d.type in return_types for d in descendants)
                self.while_loops.append({
                    "line": loop_line,
                    "col": lnode.start_point[1],
                    "has_break": has_break,
                    "has_return_in_loop": has_ret,
                })

        # Nesting depth
        self._compute_nesting(self.root, 0, loop_types, cond_types, fn_types)

        # Conditionals
        cond_nodes = _find_all(self.root, cond_types)
        self.conditional_count = len(cond_nodes)

        # Variables
        var_nodes = _find_all(self.root, var_types)
        for vnode in var_nodes:
            for child in _find_children_recursive(vnode):
                if child.type == "identifier":
                    self.variables.add(_get_node_text(child, self.source))
        self.variable_count = len(self.variables)

        # Imports
        import_nodes = _find_all(self.root, import_types)
        for inode in import_nodes:
            for child in _find_children_recursive(inode):
                if child.type in ("identifier", "dotted_name", "string_literal",
                                   "system_lib_string"):
                    name = _get_node_text(child, self.source).strip('"<>')
                    self.imported_names.add(name.split(".")[0].split("/")[0])

        # Returns at module level
        ret_nodes = _find_all(self.root, return_types)
        if ret_nodes:
            self.has_return = True

        # Data structure detection from variable names + type hints
        all_text = self.source.decode("utf-8", errors="replace").lower()
        if any(k in all_text for k in ("arraylist", "list(", "[]", "vector<", "array")):
            self.uses_list = True
        if any(k in all_text for k in ("hashmap", "dict(", "map<", "{}", "object")):
            self.uses_dict = True
        if any(k in all_text for k in ("hashset", "set(", "set<")):
            self.uses_set = True

    def _process_function(self, fn_node: Node, fn_types, loop_types,
                          cond_types, call_types, return_types):
        """Analyze a single function/method node."""
        name = _get_function_name(fn_node, self.lang, self.source)
        self.functions.append(name)
        params = _get_function_params(fn_node, self.lang, self.source)
        self.variables.update(params)

        # Body analysis
        descendants = _find_children_recursive(fn_node)
        calls_itself = False
        calls: List[str] = []
        has_return = False
        return_lines: List[int] = []
        loop_count = 0
        has_base_case = False
        local_vars: List[str] = []
        recursive_count = 0

        for d in descendants:
            # Calls
            if d.type in call_types:
                # Get called function name
                called_name = ""
                for c in d.children:
                    if c.type in ("identifier", "field_identifier", "property_identifier"):
                        called_name = _get_node_text(c, self.source)
                        break
                    elif c.type == "member_expression":
                        # obj.method() → get method name
                        for mc in c.children:
                            if mc.type == "property_identifier":
                                called_name = _get_node_text(mc, self.source)
                                break
                if called_name:
                    calls.append(called_name)
                    if called_name == name:
                        calls_itself = True
                        recursive_count += 1

            # Returns
            if d.type in return_types:
                has_return = True
                return_lines.append(d.start_point[0] + 1)

            # Loops inside function
            if d.type in loop_types:
                loop_count += 1

            # Local variable assignments
            if d.type == "identifier":
                parent = d.parent
                if parent and parent.type in _VARIABLE_NODES.get(self.lang, set()):
                    local_vars.append(_get_node_text(d, self.source))

        # Base case detection: if + return inside a recursive function
        if calls_itself:
            self.has_recursion = True
            self.recursion_count += recursive_count
            cond_nodes_in_fn = [d for d in descendants if d.type in cond_types]
            for cn in cond_nodes_in_fn:
                cn_descendants = _find_children_recursive(cn)
                has_ret_in_cond = any(cd.type in return_types for cd in cn_descendants)
                if has_ret_in_cond:
                    has_base_case = True
                    break

        # Get docstring (Python only)
        docstring = None
        if self.lang == "python":
            for child in fn_node.children:
                if child.type == "block":
                    for stmt in child.children:
                        if stmt.type == "expression_statement":
                            for sc in stmt.children:
                                if sc.type == "string":
                                    docstring = _get_node_text(sc, self.source)
                            break
                    break

        self.function_profiles.append(FunctionProfile(
            name=name,
            start_line=fn_node.start_point[0] + 1,
            param_names=params,
            local_variables=list(set(local_vars)),
            calls_itself=calls_itself,
            calls=list(set(calls)),
            has_return=has_return,
            return_lines=return_lines,
            loop_count=loop_count,
            has_base_case=has_base_case,
            docstring=docstring,
        ))

    def _compute_nesting(self, node: Node, depth: int,
                         loop_types: Set[str], cond_types: Set[str],
                         fn_types: Set[str]):
        """Recursively compute maximum nesting depth."""
        is_nesting = node.type in (loop_types | cond_types)
        new_depth = depth + 1 if is_nesting else depth
        if new_depth > self.max_nesting_depth:
            self.max_nesting_depth = new_depth

        # Track nested loop depth separately
        is_loop = node.type in loop_types
        if is_loop:
            # Count how many ancestor loops this loop has
            ancestor_loops = 0
            parent = node.parent
            while parent:
                if parent.type in loop_types:
                    ancestor_loops += 1
                parent = parent.parent
            self.nested_loop_depth = max(self.nested_loop_depth, ancestor_loops + 1)

        for child in node.children:
            self._compute_nesting(child, new_depth, loop_types, cond_types, fn_types)


# ═══════════════════════════════════════════════════════════════
#  AST PARSER  (main public class)
# ═══════════════════════════════════════════════════════════════

class ASTParser:
    """
    Parses source code via Tree-sitter and returns a rich AnalysisResult
    with pattern detection, issue locations, function profiles, and
    curriculum concept mapping.

    Supports: Python, Java, C++, JavaScript.
    """

    def __init__(self):
        self._parsers: Dict[str, Parser] = {}
        for lang_key, ts_lang in _LANGUAGES.items():
            self._parsers[lang_key] = Parser(ts_lang)

    def _resolve_language(self, language: str) -> Optional[str]:
        """Map language aliases to canonical key."""
        return _LANG_ALIASES.get(language.lower().strip())

    def analyze(self, code: str, language: str = "python") -> ASTAnalysisResult:
        """Primary entry point — dispatches by language via Tree-sitter."""
        lang = self._resolve_language(language)
        if not lang or lang not in self._parsers:
            return ASTAnalysisResult(
                is_valid=False,
                syntax_errors=[f"Language '{language}' not supported. "
                               f"Supported: {', '.join(sorted(_LANG_ALIASES.keys()))}"],
                language=language,
            )

        lines = code.split("\n")
        source = code.encode("utf-8")

        # ── Security check (Python only — uses Python ast module) ──
        if lang == "python":
            try:
                py_tree = python_ast.parse(code)
                blocked = self._check_blocked_imports(py_tree)
                if blocked:
                    raise SecurityException(blocked)
            except SyntaxError:
                pass  # Tree-sitter will catch syntax errors below
            except SecurityException:
                raise

        # ── Security check (Java / C++ / JS — regex-based) ──
        else:
            self._check_security_non_python(code, lang)

        # ── Tree-sitter parse ──
        parser = self._parsers[lang]
        tree = parser.parse(source)
        root = tree.root_node

        # ── Walk ──
        walker = _TreeSitterWalker(root, lang, source, lines)

        # Build issues and issue_locations
        issues: List[CodeIssue] = []
        issue_locations: List[IssueLocation] = []

        # Syntax errors from Tree-sitter ERROR nodes
        if walker.syntax_errors:
            issues.append(CodeIssue.SYNTAX_ERROR)
            for err_str in walker.syntax_errors:
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.SYNTAX_ERROR,
                    line=int(err_str.split(":")[0].replace("Line ", "")),
                    description=err_str,
                    suggestion="Check the syntax near this line — brackets, semicolons, or indentation.",
                ))

        # While loops without break/return
        for wl in walker.while_loops:
            if not wl["has_break"] and not wl["has_return_in_loop"]:
                snippet = lines[wl["line"] - 1].strip() if wl["line"] <= len(lines) else ""
                issues.append(CodeIssue.NO_TERMINATION)
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.NO_TERMINATION,
                    line=wl["line"], col=wl["col"],
                    code_snippet=snippet,
                    description=f"The `while` loop on line {wl['line']} may not terminate.",
                    suggestion=f"What condition makes `{snippet}` eventually become False?",
                ))

        # Function-level issues
        for fn in walker.function_profiles:
            if not fn.has_return and not fn.calls_itself:
                issues.append(CodeIssue.MISSING_RETURN)
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.MISSING_RETURN,
                    line=fn.start_line, col=0,
                    code_snippet=f"{fn.name}({', '.join(fn.param_names)})",
                    description=f"Function `{fn.name}` has no return statement.",
                    suggestion=f"What should `{fn.name}` give back to the caller?",
                ))
            if fn.calls_itself and not fn.has_base_case:
                issues.append(CodeIssue.MISSING_BASE_CASE)
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.MISSING_BASE_CASE,
                    line=fn.start_line, col=0,
                    code_snippet=f"{fn.name}(...)",
                    description=f"Recursive function `{fn.name}` has no detectable base case.",
                    suggestion=f"When should `{fn.name}` stop calling itself?",
                ))

        if walker.function_count == 0 and len(code.strip()) < 10:
            issues.append(CodeIssue.EMPTY_FUNCTION)

        # If tree has ERROR at root level, mark as invalid
        is_valid = not bool(walker.syntax_errors)

        # Pattern + concepts
        pattern = self._detect_pattern(walker)
        ds_used = self._detect_data_structures(walker)
        concepts = self._map_to_concepts(walker, pattern, ds_used)
        summary = self._build_summary(walker, pattern, ds_used, issues)

        complexity = (
            walker.function_count * 2
            + walker.loop_count * 3
            + walker.conditional_count * 2
            + walker.recursion_count * 5
            + len(ds_used)
        )

        return ASTAnalysisResult(
            is_valid=is_valid,
            issues=issues,
            issue_locations=issue_locations,
            syntax_errors=walker.syntax_errors,
            function_count=walker.function_count,
            loop_count=walker.loop_count,
            variable_count=walker.variable_count,
            has_recursion=walker.has_recursion,
            complexity_score=complexity,
            max_nesting_depth=walker.max_nesting_depth,
            code_structure={
                "functions": [fp.name for fp in walker.function_profiles],
                "loops": walker.loops,
                "conditionals": walker.conditional_count,
                "variables": list(walker.variables),
            },
            algorithm_pattern=pattern,
            function_profiles=walker.function_profiles,
            data_structures_used=ds_used,
            concepts_detected=concepts,
            student_approach_summary=summary,
            lines=lines,
            language=lang,
        )

    # ── Security checks ──────────────────────────────────

    def _check_blocked_imports(self, tree: python_ast.AST) -> List[str]:
        """Scan Python AST for dangerous imports (os, sys, subprocess, etc.)."""
        settings = get_settings()
        blocked = set(settings.BLOCKED_IMPORTS.split(","))
        violations: List[str] = []
        for node in python_ast.walk(tree):
            if isinstance(node, python_ast.Import):
                for alias in node.names:
                    root_module = alias.name.split(".")[0]
                    if root_module in blocked:
                        violations.append(root_module)
            elif isinstance(node, python_ast.ImportFrom):
                if node.module:
                    root_module = node.module.split(".")[0]
                    if root_module in blocked:
                        violations.append(root_module)
        return list(set(violations))

    def _check_security_non_python(self, code: str, lang: str):
        """Basic security checks for Java/C++/JS — block dangerous system calls."""
        settings = get_settings()

        dangerous_patterns: Dict[str, List[str]] = {
            "java": [
                r"Runtime\s*\.\s*getRuntime", r"ProcessBuilder",
                r"System\s*\.\s*exit", r"java\.io\.File",
                r"java\.net\.", r"java\.lang\.reflect",
            ],
            "cpp": [
                r"\bsystem\s*\(", r"\bexec\w*\s*\(",
                r"\bpopen\s*\(", r"#include\s*<(fstream|cstdlib)>",
            ],
            "javascript": [
                r"\beval\s*\(", r"\bexec\s*\(",
                r"\brequire\s*\(\s*['\"]child_process",
                r"\brequire\s*\(\s*['\"]fs['\"]",
                r"process\s*\.\s*exit",
            ],
        }

        violations = []
        for pat in dangerous_patterns.get(lang, []):
            if re.search(pat, code):
                violations.append(pat)

        if violations:
            raise SecurityException(violations)

    # ── Pattern detection ─────────────────────────────────

    def _detect_pattern(self, v: _TreeSitterWalker) -> AlgorithmPattern:
        has_recursion = v.has_recursion
        has_memo = any(k in var for var in v.variables for k in ("memo", "cache", "dp"))
        has_2d = any(k in var for var in v.variables for k in ("table", "dp", "matrix"))
        nested = v.nested_loop_depth >= 2
        has_queue = any(c in v.imported_names or c in v.variables
                        for c in ("deque", "queue", "Queue", "LinkedList", "ArrayDeque"))
        has_stack = any("stack" in var.lower() for var in v.variables)
        has_lo_hi = (
            any(x in v.variables for x in ("lo", "left", "l", "low", "start")) and
            any(x in v.variables for x in ("hi", "right", "r", "high", "end"))
        )
        has_window = any(k in var.lower() for var in v.variables for k in ("window", "win_"))

        if has_recursion and (has_memo or has_2d):
            return AlgorithmPattern.DYNAMIC_PROG
        if has_queue or has_stack:
            return AlgorithmPattern.BFS_DFS
        if has_recursion and has_lo_hi:
            return AlgorithmPattern.DIVIDE_CONQUER
        if has_recursion:
            return AlgorithmPattern.RECURSIVE
        if has_window:
            return AlgorithmPattern.SLIDING_WINDOW
        if has_lo_hi and not has_recursion:
            return AlgorithmPattern.TWO_POINTER
        if nested:
            return AlgorithmPattern.BRUTE_FORCE
        if v.loop_count > 0:
            return AlgorithmPattern.ITERATIVE
        return AlgorithmPattern.UNKNOWN

    def _detect_data_structures(self, v: _TreeSitterWalker) -> List[str]:
        ds: List[str] = []
        if v.uses_list:  ds.append("list")
        if v.uses_dict:  ds.append("dict")
        if v.uses_set:   ds.append("set")
        if any("stack" in var.lower() for var in v.variables): ds.append("stack")
        if any(k in var.lower() for var in v.variables
               for k in ("queue", "deque")): ds.append("queue")
        if any(k in var.lower() for var in v.variables
               for k in ("node", "head", "next", "listnode")): ds.append("linked_list")
        if any(k in var.lower() for var in v.variables
               for k in ("tree", "root", "treenode")): ds.append("tree")
        return ds

    def _map_to_concepts(self, v: _TreeSitterWalker, pattern: AlgorithmPattern,
                         ds: List[str]) -> List[str]:
        concepts: List[str] = []
        if pattern == AlgorithmPattern.RECURSIVE:       concepts.append("recursion")
        if pattern == AlgorithmPattern.DIVIDE_CONQUER:  concepts.extend(["recursion", "divide_and_conquer"])
        if pattern == AlgorithmPattern.DYNAMIC_PROG:    concepts.extend(["recursion", "dynamic_programming"])
        if pattern == AlgorithmPattern.TWO_POINTER:     concepts.append("two_pointers")
        if pattern == AlgorithmPattern.SLIDING_WINDOW:  concepts.append("sliding_window")
        if pattern == AlgorithmPattern.BFS_DFS:         concepts.extend(["graphs", "trees"])
        if pattern == AlgorithmPattern.BRUTE_FORCE:     concepts.append("time_complexity")
        if v.loop_count > 0:   concepts.append("loops")
        if v.function_count:   concepts.append("functions")
        if v.conditional_count: concepts.append("conditionals")
        concepts.extend(ds)
        return list(dict.fromkeys(concepts))

    def _build_summary(self, v: _TreeSitterWalker, pattern: AlgorithmPattern,
                       ds: List[str], issues: List[CodeIssue]) -> str:
        parts = []
        fnames = [fp.name for fp in v.function_profiles]
        if fnames:
            parts.append(f"defines {len(fnames)} function(s): {', '.join(fnames)}")
        parts.append(f"uses a {pattern.value.replace('_', ' ')} approach")
        if v.loop_count:
            parts.append(f"{v.loop_count} loop(s) ({', '.join(v.loops[:3])})")
        if ds:
            parts.append(f"data structures: {', '.join(ds)}")
        if issues:
            parts.append(f"potential issues: {', '.join(i.value.replace('_', ' ') for i in issues)}")
        if v.nested_loop_depth >= 2:
            parts.append("nested loops detected (possible O(n²) complexity)")
        return "Student's code " + "; ".join(parts) + "."

    # ── Rich context for LLM prompts ─────────────────────

    def build_llm_context(self, result: ASTAnalysisResult) -> dict:
        """Structured dict for injection into LLM prompts."""
        fn_details = []
        for fp in result.function_profiles:
            d = f"  • `{fp.name}({', '.join(fp.param_names)})`"
            if fp.calls_itself: d += " [recursive]"
            if not fp.has_base_case and fp.calls_itself: d += " ⚠️ no base case"
            if not fp.has_return: d += " ⚠️ no return"
            fn_details.append(d)

        issue_strings = [
            f"  • Line {loc.line}: {loc.description} → {loc.suggestion}"
            for loc in result.issue_locations
        ]

        return {
            "algorithm_pattern": result.algorithm_pattern.value,
            "student_approach": result.student_approach_summary,
            "functions": fn_details,
            "data_structures": result.data_structures_used,
            "concepts": result.concepts_detected,
            "issues": issue_strings,
            "complexity": result.complexity_score,
            "has_recursion": result.has_recursion,
            "max_nesting_depth": result.max_nesting_depth,
            "loop_count": result.loop_count,
            "language": getattr(result, "language", "python"),
        }


# ═══════════════════════════════════════════════════════════════
#  Singleton
# ═══════════════════════════════════════════════════════════════
ast_parser = ASTParser()
