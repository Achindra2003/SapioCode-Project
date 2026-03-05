# analytics/class_analytics.py
"""
Class-Level Analytics Engine.

Provides:
  - Mastery heatmap grid (student × concept) for teacher dashboard
  - At-risk student identification
  - Concept difficulty report
"""

from typing import Optional, List, Dict, Any
from navigation.curriculum import get_curriculum_graph, CONCEPTS
from db.neo4j import get_session
from bkt.config import MASTERY_THRESHOLD


class ClassAnalyticsEngine:
    """
    Aggregates individual student BKT data for class-level insights.
    
    Works with both Neo4j-backed data and in-memory mastery from
    the recommendation engine's cache.
    """

    def __init__(self):
        self._curriculum = get_curriculum_graph()

    def get_class_heatmap(
        self, student_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Build a mastery heatmap grid: student × concept.
        
        Returns:
            {
                "concepts": ["variables", "conditionals", ...],
                "concept_names": ["Variables & Types", ...],
                "grid": [
                    {"student_id": "S1", "masteries": [0.8, 0.5, ...]},
                    ...
                ]
            }
        """
        concept_ids = [c["id"] for c in CONCEPTS]
        concept_names = [c["name"] for c in CONCEPTS]

        grid = []
        for sid in student_ids:
            mastery_map = self._load_student_mastery(sid)
            masteries = [
                round(mastery_map.get(cid, 0.0), 4) for cid in concept_ids
            ]
            grid.append({
                "student_id": sid,
                "masteries": masteries,
            })

        return {
            "concepts": concept_ids,
            "concept_names": concept_names,
            "grid": grid,
        }

    def get_at_risk_students(
        self, student_ids: List[str], threshold: float = 0.4
    ) -> List[Dict[str, Any]]:
        """
        Identify students whose average mastery is below threshold.
        
        Returns list of at-risk students with details.
        """
        at_risk = []
        for sid in student_ids:
            mastery_map = self._load_student_mastery(sid)
            if not mastery_map:
                at_risk.append({
                    "student_id": sid,
                    "average_mastery": 0.0,
                    "concepts_attempted": 0,
                    "weakest_concepts": [],
                    "reason": "No attempts recorded",
                })
                continue

            avg = sum(mastery_map.values()) / len(mastery_map)
            if avg < threshold:
                weakest = sorted(mastery_map.items(), key=lambda x: x[1])[:3]
                at_risk.append({
                    "student_id": sid,
                    "average_mastery": round(avg, 4),
                    "concepts_attempted": len(mastery_map),
                    "weakest_concepts": [
                        {"concept": k, "mastery": round(v, 4)}
                        for k, v in weakest
                    ],
                    "reason": f"Average mastery {avg:.1%} is below {threshold:.0%}",
                })

        return at_risk

    def get_concept_difficulty_report(self) -> List[Dict[str, Any]]:
        """
        Rank concepts by average mastery across all students.
        Lower average = harder concept.
        """
        concept_scores: Dict[str, List[float]] = {}
        try:
            with get_session() as session:
                results = session.run(
                    """
                    MATCH (s:Student)-[m:MASTERY]->(c:Concept)
                    RETURN c.name AS concept, AVG(m.p) AS avg_mastery,
                           COUNT(s) AS student_count
                    ORDER BY avg_mastery ASC
                    """
                )
                report = []
                for record in results:
                    report.append({
                        "concept": record["concept"],
                        "average_mastery": round(record["avg_mastery"], 4),
                        "students_attempted": record["student_count"],
                    })
                return report
        except Exception:
            return []

    def _load_student_mastery(self, student_id: str) -> Dict[str, float]:
        """Load mastery data from Neo4j or empty dict."""
        mastery = {}
        try:
            with get_session() as session:
                results = session.run(
                    """
                    MATCH (s:Student {sid: $sid})-[m:MASTERY]->(c:Concept)
                    RETURN c.name AS concept, m.p AS mastery
                    """,
                    sid=student_id,
                )
                for record in results:
                    mastery[record["concept"]] = record["mastery"]
        except Exception as e:
            print(f"[Analytics] Failed to load mastery for {student_id}: {e}")
        return mastery


# ─── Singleton ────────────────────────────────────
_engine: Optional[ClassAnalyticsEngine] = None


def get_analytics_engine() -> ClassAnalyticsEngine:
    global _engine
    if _engine is None:
        _engine = ClassAnalyticsEngine()
    return _engine
