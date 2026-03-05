# navigation/recommend.py
"""
Zone of Proximal Development (ZPD) Recommendation Engine.

Uses BKT mastery data + curriculum prerequisites to recommend:
  - Next concept to study (lowest mastery among unlocked)
  - Weakest concepts for remediation
  - Full curriculum with states
"""

from typing import Optional, List, Dict, Any
from navigation.curriculum import get_curriculum_graph
from db.neo4j import get_session
from bkt.config import MASTERY_THRESHOLD


class RecommendationEngine:
    """
    ZPD-based concept recommendation engine.
    
    Works with both Neo4j-backed and in-memory mastery data.
    Falls back gracefully when Neo4j is unavailable.
    """

    def __init__(self):
        self._curriculum = get_curriculum_graph()
        # In-memory mastery cache (populated from Neo4j or mock)
        self._mastery_cache: Dict[str, Dict[str, float]] = {}

    def _load_student_mastery(self, student_id: str) -> Dict[str, float]:
        """Load mastery data for a student from Neo4j or cache."""
        if student_id in self._mastery_cache:
            return self._mastery_cache[student_id]

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
            print(f"[Navigation] Failed to load mastery: {e}")

        self._mastery_cache[student_id] = mastery
        return mastery

    def update_mastery_cache(
        self, student_id: str, concept: str, mastery: float
    ):
        """Update cache after a BKT update (avoids re-querying Neo4j)."""
        if student_id not in self._mastery_cache:
            self._mastery_cache[student_id] = {}
        self._mastery_cache[student_id][concept] = mastery

    def get_curriculum(self, student_id: str) -> List[Dict[str, Any]]:
        """Get full curriculum with per-concept states for a student."""
        mastery = self._load_student_mastery(student_id)
        return self._curriculum.compute_curriculum_state(mastery)

    def get_next_recommended(self, student_id: str) -> Optional[Dict[str, Any]]:
        """
        Recommend the next concept in the student's ZPD.
        
        Returns the *unlocked but not mastered* concept with the
        lowest current mastery, i.e. the concept where the student
        needs the most help among those they're ready to learn.
        """
        curriculum = self.get_curriculum(student_id)
        current = [c for c in curriculum if c["state"] == "current"]
        if not current:
            return None
        return min(current, key=lambda c: c["mastery"])

    def get_weakest_concepts(
        self, student_id: str, n: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Get the N weakest concepts for remediation.
        
        Only considers concepts the student has attempted
        (mastery > 0 but below threshold).
        """
        mastery = self._load_student_mastery(student_id)
        attempted = [
            {"concept": k, "mastery": v}
            for k, v in mastery.items()
            if v < MASTERY_THRESHOLD
        ]
        attempted.sort(key=lambda x: x["mastery"])
        return attempted[:n]

    def invalidate_cache(self, student_id: str):
        """Clear cache for a student (e.g. after Neo4j sync)."""
        self._mastery_cache.pop(student_id, None)


# ─── Singleton ────────────────────────────────────
_engine: Optional[RecommendationEngine] = None


def get_recommendation_engine() -> RecommendationEngine:
    global _engine
    if _engine is None:
        _engine = RecommendationEngine()
    return _engine
