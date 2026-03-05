"""
AST Parser — Deep structural analysis of student code.

This is the SYMBOLIC half of the NS-CITS architecture.
Pure Python, no LLM calls, no async, no external dependencies.

Detects:
  - Algorithm patterns (recursive, iterative, DP, two-pointer, BFS/DFS, brute-force)
  - Data structures (list, dict, set, stack, queue, linked list, tree)
  - Code issues with exact line numbers and Socratic suggestions
  - Function profiles (recursion, base case, return, loops)
  - Curriculum concept mapping

Adapted from the original CodeAnalyzer but fully self-contained for the pivot.
"""
import ast
import re
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum

from app.core.config import get_settings


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


# Backward-compatible alias
AnalysisResult = ASTAnalysisResult


# ═══════════════════════════════════════════════════════════════
#  AST PARSER  (main public class)
# ═══════════════════════════════════════════════════════════════

class ASTParser:
    """
    Parses Python source code via the `ast` module and returns
    a rich AnalysisResult with pattern detection, issue locations,
    function profiles, and curriculum concept mapping.
    """

    def analyze(self, code: str, language: str = "python") -> ASTAnalysisResult:
        """Primary entry point — dispatches by language."""
        if language == "python":
            return self._analyze_python(code)
        # Future: tree-sitter for JS/Java/C++
        return ASTAnalysisResult(
            is_valid=False,
            syntax_errors=[f"Language '{language}' not yet supported"],
        )

    # ── Python analysis ───────────────────────────────────

    def _analyze_python(self, code: str) -> ASTAnalysisResult:
        lines = code.split("\n")
        issues: List[CodeIssue] = []
        issue_locations: List[IssueLocation] = []

        # Parse
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            loc = IssueLocation(
                issue_type=CodeIssue.SYNTAX_ERROR,
                line=e.lineno, col=e.offset,
                code_snippet=lines[e.lineno - 1] if e.lineno and e.lineno <= len(lines) else "",
                description=f"SyntaxError: {e.msg}",
                suggestion="Check the indentation and brackets on this line.",
            )
            return ASTAnalysisResult(
                is_valid=False, issues=[CodeIssue.SYNTAX_ERROR],
                issue_locations=[loc],
                syntax_errors=[f"Line {e.lineno}: {e.msg}"],
                lines=lines,
            )

        # ── Security gatekeeper: block dangerous imports ──
        blocked = self._check_blocked_imports(tree)
        if blocked:
            raise SecurityException(blocked)

        # Walk
        visitor = _DeepVisitor(lines)
        visitor.visit(tree)

        # Issue detection
        for wl in visitor.while_loops:
            if not wl["has_break"] and not wl["has_return_in_loop"]:
                snippet = lines[wl["line"] - 1] if wl["line"] <= len(lines) else ""
                issues.append(CodeIssue.NO_TERMINATION)
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.NO_TERMINATION,
                    line=wl["line"], col=wl["col"],
                    code_snippet=snippet.strip(),
                    description=f"The `while` loop on line {wl['line']} may not terminate.",
                    suggestion=f"What condition makes `{snippet.strip()}` eventually become False?",
                ))

        for fn in visitor.function_profiles:
            if not fn.has_return and not fn.calls_itself:
                issues.append(CodeIssue.MISSING_RETURN)
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.MISSING_RETURN,
                    line=fn.start_line, col=0,
                    code_snippet=f"def {fn.name}({', '.join(fn.param_names)}):",
                    description=f"Function `{fn.name}` has no return statement.",
                    suggestion=f"What should `{fn.name}` give back to the caller?",
                ))
            if fn.calls_itself and not fn.has_base_case:
                issues.append(CodeIssue.MISSING_BASE_CASE)
                issue_locations.append(IssueLocation(
                    issue_type=CodeIssue.MISSING_BASE_CASE,
                    line=fn.start_line, col=0,
                    code_snippet=f"def {fn.name}(...):",
                    description=f"Recursive function `{fn.name}` has no detectable base case.",
                    suggestion=f"When should `{fn.name}` stop calling itself?",
                ))

        if visitor.function_count == 0 and len(code.strip()) < 10:
            issues.append(CodeIssue.EMPTY_FUNCTION)

        # Pattern + concepts
        pattern = self._detect_pattern(visitor)
        ds_used = self._detect_data_structures(visitor)
        concepts = self._map_to_concepts(visitor, pattern, ds_used)
        summary = self._build_summary(visitor, pattern, ds_used, issues)

        complexity = (
            visitor.function_count * 2
            + visitor.loop_count * 3
            + visitor.conditional_count * 2
            + visitor.recursion_count * 5
            + len(ds_used)
        )

        return ASTAnalysisResult(
            is_valid=True, issues=issues, issue_locations=issue_locations,
            syntax_errors=[],
            function_count=visitor.function_count,
            loop_count=visitor.loop_count,
            variable_count=visitor.variable_count,
            has_recursion=visitor.has_recursion,
            complexity_score=complexity,
            max_nesting_depth=visitor.max_nesting_depth,
            code_structure={
                "functions": [fp.name for fp in visitor.function_profiles],
                "loops": visitor.loops,
                "conditionals": visitor.conditional_count,
                "variables": list(visitor.variables),
            },
            algorithm_pattern=pattern,
            function_profiles=visitor.function_profiles,
            data_structures_used=ds_used,
            concepts_detected=concepts,
            student_approach_summary=summary,
            lines=lines,
        )

    # ── Security check ───────────────────────────────────

    def _check_blocked_imports(self, tree: ast.AST) -> List[str]:
        """Scan AST for dangerous imports (os, sys, subprocess, etc.)."""
        settings = get_settings()
        blocked = set(settings.BLOCKED_IMPORTS.split(","))
        violations: List[str] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root_module = alias.name.split(".")[0]
                    if root_module in blocked:
                        violations.append(root_module)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    root_module = node.module.split(".")[0]
                    if root_module in blocked:
                        violations.append(root_module)
        return list(set(violations))

    # ── Pattern detection ─────────────────────────────────

    def _detect_pattern(self, v: "_DeepVisitor") -> AlgorithmPattern:
        has_recursion = v.has_recursion
        has_memo = any(k in var for var in v.variables for k in ("memo", "cache", "dp"))
        has_2d = any(k in var for var in v.variables for k in ("table", "dp", "matrix"))
        nested = v.nested_loop_depth >= 2
        has_queue = any(c in v.imported_names or c in v.variables for c in ("deque", "queue", "Queue"))
        has_stack = any("stack" in var for var in v.variables)
        has_lo_hi = (
            any(x in v.variables for x in ("lo", "left", "l")) and
            any(x in v.variables for x in ("hi", "right", "r"))
        )
        has_window = any(k in var for var in v.variables for k in ("window", "win_"))

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

    def _detect_data_structures(self, v: "_DeepVisitor") -> List[str]:
        ds: List[str] = []
        if v.uses_list:  ds.append("list")
        if v.uses_dict:  ds.append("dict")
        if v.uses_set:   ds.append("set")
        if any("stack" in var for var in v.variables): ds.append("stack")
        if any("queue" in var or "deque" in var for var in v.variables): ds.append("queue")
        if any(k in var for var in v.variables for k in ("node", "head", "next")): ds.append("linked_list")
        if any(k in var for var in v.variables for k in ("tree", "root")): ds.append("tree")
        return ds

    def _map_to_concepts(self, v: "_DeepVisitor", pattern: AlgorithmPattern, ds: List[str]) -> List[str]:
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

    def _build_summary(self, v: "_DeepVisitor", pattern: AlgorithmPattern, ds: List[str], issues: List[CodeIssue]) -> str:
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
        }


# ═══════════════════════════════════════════════════════════════
#  INTERNAL: Deep AST Visitor
# ═══════════════════════════════════════════════════════════════

class _DeepVisitor(ast.NodeVisitor):
    """Walks the AST collecting deep structural info."""

    def __init__(self, lines: List[str]):
        self.lines = lines
        self.function_count = 0
        self.loop_count = 0
        self.variable_count = 0
        self.conditional_count = 0
        self.recursion_count = 0
        self.nested_loop_depth = 0
        self._current_loop_depth = 0
        self.max_nesting_depth = 0
        self._nesting_depth = 0
        self.has_return = False
        self.has_break = False
        self.has_recursion = False
        self.uses_list = False
        self.uses_dict = False
        self.uses_set = False
        self.functions: List[str] = []
        self.loops: List[str] = []
        self.variables: set = set()
        self.imported_names: set = set()
        self.while_loops: List[dict] = []
        self.function_profiles: List[FunctionProfile] = []
        self._current_function: Optional[str] = None
        self._function_stack: List[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.function_count += 1
        self.functions.append(node.name)
        params = [a.arg for a in node.args.args]
        # Include function params in variable set for pattern detection
        # (e.g. `memo` in `def fib(n, memo={})` signals memoisation)
        self.variables.update(params)
        prev = self._current_function
        self._current_function = node.name
        self._function_stack.append(node.name)

        sub = _FunctionBodyVisitor(node.name, self.lines)
        sub.visit(node)

        if sub.calls_itself:
            self.has_recursion = True
            self.recursion_count += sub.recursive_call_count

        self.function_profiles.append(FunctionProfile(
            name=node.name, start_line=node.lineno,
            param_names=params, local_variables=sub.local_vars,
            calls_itself=sub.calls_itself, calls=sub.calls,
            has_return=sub.has_return, return_lines=sub.return_lines,
            loop_count=sub.loop_count, has_base_case=sub.has_base_case,
            docstring=ast.get_docstring(node),
        ))
        if sub.has_return:
            self.has_return = True
        self.generic_visit(node)
        self._function_stack.pop()
        self._current_function = prev

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_For(self, node: ast.For):
        self.loop_count += 1
        self.loops.append(f"for (line {node.lineno})")
        self._current_loop_depth += 1
        self.nested_loop_depth = max(self.nested_loop_depth, self._current_loop_depth)
        self._nesting_depth += 1
        self.max_nesting_depth = max(self.max_nesting_depth, self._nesting_depth)
        self.generic_visit(node)
        self._current_loop_depth -= 1
        self._nesting_depth -= 1

    def visit_While(self, node: ast.While):
        self.loop_count += 1
        self.loops.append(f"while (line {node.lineno})")
        self._current_loop_depth += 1
        self.nested_loop_depth = max(self.nested_loop_depth, self._current_loop_depth)
        self._nesting_depth += 1
        self.max_nesting_depth = max(self.max_nesting_depth, self._nesting_depth)
        has_break = any(isinstance(n, ast.Break) for n in ast.walk(node))
        has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
        self.while_loops.append({
            "line": node.lineno, "col": node.col_offset,
            "has_break": has_break, "has_return_in_loop": has_return,
        })
        self.generic_visit(node)
        self._current_loop_depth -= 1
        self._nesting_depth -= 1

    def visit_If(self, node: ast.If):
        self.conditional_count += 1
        self._nesting_depth += 1
        self.max_nesting_depth = max(self.max_nesting_depth, self._nesting_depth)
        self.generic_visit(node)
        self._nesting_depth -= 1

    def visit_Return(self, node: ast.Return):
        self.has_return = True
        self.generic_visit(node)

    def visit_Break(self, node: ast.Break):
        self.has_break = True

    def visit_Name(self, node: ast.Name):
        if isinstance(node.ctx, ast.Store):
            self.variables.add(node.id)
            self.variable_count = len(self.variables)
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        if isinstance(node.value, ast.List):  self.uses_list = True
        if isinstance(node.value, ast.Dict):  self.uses_dict = True
        if isinstance(node.value, ast.Set):   self.uses_set = True
        if isinstance(node.value, ast.Call):
            fname = ""
            if isinstance(node.value.func, ast.Name):
                fname = node.value.func.id
            if fname == "list":  self.uses_list = True
            if fname == "dict":  self.uses_dict = True
            if fname == "set":   self.uses_set = True
        self.generic_visit(node)

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.imported_names.add(alias.asname or alias.name.split(".")[0])

    def visit_ImportFrom(self, node: ast.ImportFrom):
        for alias in node.names:
            self.imported_names.add(alias.asname or alias.name)


class _FunctionBodyVisitor(ast.NodeVisitor):
    """Collects details about a single function's body."""

    def __init__(self, func_name: str, lines: List[str]):
        self.func_name = func_name
        self.lines = lines
        self.local_vars: List[str] = []
        self.calls: List[str] = []
        self.calls_itself = False
        self.recursive_call_count = 0
        self.has_return = False
        self.return_lines: List[int] = []
        self.loop_count = 0
        self.has_base_case = False

    def visit_Return(self, node: ast.Return):
        self.has_return = True
        self.return_lines.append(node.lineno)
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name):
        if isinstance(node.ctx, ast.Store):
            self.local_vars.append(node.id)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Name):
            self.calls.append(node.func.id)
            if node.func.id == self.func_name:
                self.calls_itself = True
                self.recursive_call_count += 1
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        self.loop_count += 1
        self.generic_visit(node)

    def visit_While(self, node: ast.While):
        self.loop_count += 1
        self.generic_visit(node)

    def visit_If(self, node: ast.If):
        body = node.body
        if len(body) == 1 and isinstance(body[0], ast.Return):
            self.has_base_case = True
        self.generic_visit(node)


# ═══════════════════════════════════════════════════════════════
#  Singleton
# ═══════════════════════════════════════════════════════════════
ast_parser = ASTParser()
