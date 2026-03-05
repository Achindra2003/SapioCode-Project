# analytics/mastery_history.py
"""
Mastery History Store — Timestamped mastery snapshots.

Records every BKT update as a versioned snapshot with:
  - Mastery before and after
  - Cognitive state at time of update
  - BKT explanation text
  - Timestamp

Provides retrieval for:
  - Per-concept timeline (for learning curve visualisation)
  - Full student history (for teacher dashboard)
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from collections import defaultdict


class MasterySnapshot:
    """A single timestamped mastery record."""

    def __init__(
        self,
        concept: str,
        old_mastery: float,
        new_mastery: float,
        mastery_delta: float,
        correct: bool,
        cognitive_state: dict,
        explanation: str,
        timestamp: Optional[str] = None,
    ):
        self.concept = concept
        self.old_mastery = old_mastery
        self.new_mastery = new_mastery
        self.mastery_delta = mastery_delta
        self.correct = correct
        self.cognitive_state = cognitive_state
        self.explanation = explanation
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "concept": self.concept,
            "old_mastery": self.old_mastery,
            "new_mastery": self.new_mastery,
            "mastery_delta": self.mastery_delta,
            "correct": self.correct,
            "cognitive_state": self.cognitive_state,
            "explanation": self.explanation,
            "timestamp": self.timestamp,
        }


class MasteryHistoryStore:
    """
    In-memory mastery history with optional Neo4j persistence.
    
    Structure:
      _history[student_id][concept] = [MasterySnapshot, ...]
    """

    def __init__(self):
        # student_id -> concept -> list of snapshots
        self._history: Dict[str, Dict[str, List[MasterySnapshot]]] = defaultdict(
            lambda: defaultdict(list)
        )

    def record(
        self,
        student_id: str,
        concept: str,
        old_mastery: float,
        new_mastery: float,
        correct: bool,
        cognitive_state: dict,
        explanation: str,
    ) -> MasterySnapshot:
        """Record a new mastery update snapshot."""
        snapshot = MasterySnapshot(
            concept=concept,
            old_mastery=old_mastery,
            new_mastery=new_mastery,
            mastery_delta=round(new_mastery - old_mastery, 4),
            correct=correct,
            cognitive_state=cognitive_state,
            explanation=explanation,
        )
        self._history[student_id][concept].append(snapshot)
        return snapshot

    def get_concept_history(
        self, student_id: str, concept: str
    ) -> List[dict]:
        """Get mastery timeline for a specific concept."""
        snapshots = self._history.get(student_id, {}).get(concept, [])
        return [s.to_dict() for s in snapshots]

    def get_all_history(self, student_id: str) -> List[dict]:
        """Get all mastery snapshots for a student, sorted by time."""
        all_snapshots = []
        for concept_snapshots in self._history.get(student_id, {}).values():
            all_snapshots.extend(concept_snapshots)
        all_snapshots.sort(key=lambda s: s.timestamp)
        return [s.to_dict() for s in all_snapshots]

    def get_summary(self, student_id: str) -> Dict[str, Any]:
        """Get a summary of mastery history for a student."""
        student_data = self._history.get(student_id, {})
        summary = {
            "total_updates": 0,
            "concepts_tracked": len(student_data),
            "concepts": {},
        }
        for concept, snapshots in student_data.items():
            summary["total_updates"] += len(snapshots)
            if snapshots:
                latest = snapshots[-1]
                summary["concepts"][concept] = {
                    "current_mastery": latest.new_mastery,
                    "total_attempts": len(snapshots),
                    "first_attempt": snapshots[0].timestamp,
                    "last_attempt": latest.timestamp,
                    "improvement": round(
                        latest.new_mastery - snapshots[0].old_mastery, 4
                    ),
                }
        return summary


# ─── Singleton ────────────────────────────────────
_store: Optional[MasteryHistoryStore] = None


def get_history_store() -> MasteryHistoryStore:
    global _store
    if _store is None:
        _store = MasteryHistoryStore()
    return _store
