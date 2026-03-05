# navigation/curriculum.py
"""
In-memory curriculum graph with prerequisite dependencies.
Mirrors the 12-concept CS curriculum from the team's neo4j_graph.py.

Provides:
  - Static curriculum structure with prerequisite edges
  - Per-student state computation: locked | current | completed
  - Mastery-driven unlock logic (concept mastered at >= threshold)
"""

from typing import List, Dict, Any, Optional
from bkt.config import MASTERY_THRESHOLD


# ─── Curriculum Definition ────────────────────────
# Matches the team's seed_curriculum() in ai-backend/app/db/neo4j_graph.py
CONCEPTS = [
    {"id": "variables",            "name": "Variables & Types",     "difficulty": "easy",   "description": "Primitive data types, assignment, type casting"},
    {"id": "conditionals",         "name": "Conditionals",          "difficulty": "easy",   "description": "If/else, switch, boolean logic"},
    {"id": "loops",                "name": "Loops",                 "difficulty": "easy",   "description": "For, while, do-while, iteration patterns"},
    {"id": "functions",            "name": "Functions",             "difficulty": "medium", "description": "Definition, parameters, return values, scope"},
    {"id": "arrays",               "name": "Arrays & Lists",        "difficulty": "medium", "description": "Indexing, slicing, list operations"},
    {"id": "strings",              "name": "String Manipulation",   "difficulty": "medium", "description": "Concatenation, parsing, regex basics"},
    {"id": "recursion",            "name": "Recursion",             "difficulty": "hard",   "description": "Base case, recursive step, call stack"},
    {"id": "sorting",              "name": "Sorting Algorithms",    "difficulty": "hard",   "description": "Bubble, merge, quick sort, complexity"},
    {"id": "linked_lists",         "name": "Linked Lists",          "difficulty": "hard",   "description": "Singly/doubly linked, insertion, deletion"},
    {"id": "trees",                "name": "Trees",                 "difficulty": "hard",   "description": "Binary trees, BST, traversal"},
    {"id": "graphs",               "name": "Graphs",                "difficulty": "hard",   "description": "BFS, DFS, adjacency representation"},
    {"id": "dynamic_programming",  "name": "Dynamic Programming",   "difficulty": "hard",   "description": "Memoization, tabulation"},
]

PREREQUISITES = {
    "conditionals": ["variables"],
    "loops": ["conditionals"],
    "functions": ["loops"],
    "arrays": ["loops"],
    "strings": ["arrays"],
    "recursion": ["functions"],
    "sorting": ["arrays", "recursion"],
    "linked_lists": ["arrays", "recursion"],
    "trees": ["linked_lists", "recursion"],
    "graphs": ["trees"],
    "dynamic_programming": ["recursion", "arrays"],
}


class CurriculumGraph:
    """
    In-memory curriculum with prerequisite-based navigation.
    
    States per student-concept pair:
      - completed: mastery >= threshold
      - current:   all prerequisites completed, not yet mastered
      - locked:    at least one prerequisite not completed
    """

    def __init__(self):
        self._concepts = {c["id"]: c for c in CONCEPTS}
        self._prereqs = dict(PREREQUISITES)

    def get_concept(self, concept_id: str) -> Optional[dict]:
        return self._concepts.get(concept_id)

    def get_prerequisites(self, concept_id: str) -> List[str]:
        return self._prereqs.get(concept_id, [])

    def get_all_concept_ids(self) -> List[str]:
        return list(self._concepts.keys())

    def compute_curriculum_state(
        self, student_mastery: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Compute the full curriculum with per-concept states for a student.
        
        Args:
            student_mastery: {concept_id: mastery_probability}
        
        Returns:
            List of concept dicts with 'state' field added.
        """
        result = []
        for concept in CONCEPTS:
            cid = concept["id"]
            mastery = student_mastery.get(cid, 0.0)
            is_mastered = mastery >= MASTERY_THRESHOLD

            prereqs = self.get_prerequisites(cid)
            all_prereqs_met = all(
                student_mastery.get(p, 0.0) >= MASTERY_THRESHOLD
                for p in prereqs
            )

            if is_mastered:
                state = "completed"
            elif all_prereqs_met:
                state = "current"
            else:
                state = "locked"

            result.append({
                **concept,
                "mastery": round(mastery, 4),
                "is_mastered": is_mastered,
                "state": state,
                "prerequisites": prereqs,
            })
        return result


# ─── Singleton ────────────────────────────────────
_curriculum: Optional[CurriculumGraph] = None


def get_curriculum_graph() -> CurriculumGraph:
    global _curriculum
    if _curriculum is None:
        _curriculum = CurriculumGraph()
    return _curriculum
