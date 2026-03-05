from typing import Optional, List, Dict, Any
from bkt.updater import update_mastery_bkt
from bkt.affect_fusion import modulate_bkt_params
from bkt.explainability import explain_bkt_update
from bkt.config import MASTERY_THRESHOLD, DEFAULT_COGNITIVE_STATE
from analytics.mastery_history import get_history_store


def process_submission_bkt(
    neo4j_session,
    sid: str,
    sub_id: str,
    correct: bool,
    cognitive_state: Optional[dict] = None
) -> List[Dict[str, Any]]:
    """
    Orchestrates BKT updates for one submission.
    Returns list of mastery updates.
    """

    if cognitive_state is None:
        cognitive_state = dict(DEFAULT_COGNITIVE_STATE)

    updates = []
    history_store = get_history_store()

    results = neo4j_session.run(
        """
        MATCH (s:Student {sid: $sid})-[m:MASTERY]->(c:Concept)
        MATCH (s)-[:MADE]->(sub:Submission {sub_id: $sub_id})
        MATCH (sub)-[:OF_PROBLEM]->(:Problem)-[:TESTS]->(c)
        RETURN
          c.name AS concept,
          m.p AS current_mastery,
          c.bkt_p_T AS p_T,
          c.bkt_p_S AS p_S,
          c.bkt_p_G AS p_G
        """,
        sid=sid,
        sub_id=sub_id
    )
    for record in results:
        old_p = record["current_mastery"]

        base_params = {
            "p_T": record["p_T"],
            "p_S": record["p_S"],
            "p_G": record["p_G"]
        }

        adapted_params = modulate_bkt_params(
            base_params=base_params,
            cognitive_state=cognitive_state
        )

        new_p = update_mastery_bkt(
            current_p=old_p,
            correct=correct,
            concept_params=adapted_params
        )

        explanation = explain_bkt_update(
            cognitive_state=cognitive_state,
            base_params=base_params,
            adapted_params=adapted_params,
            old_mastery=old_p,
            new_mastery=new_p
        )

        print(f"[BKT] Concept: {record['concept']}")
        print("EXPLANATION:", explanation["summary"])

        # Persist to Neo4j
        neo4j_session.run(
            """
            MATCH (s:Student {sid: $sid})-[m:MASTERY]->(c:Concept {name: $concept})
            SET m.p = $new_p
            """,
            sid=sid,
            concept=record["concept"],
            new_p=new_p
        )

        # Record mastery history snapshot
        history_store.record(
            student_id=sid,
            concept=record["concept"],
            old_mastery=old_p,
            new_mastery=new_p,
            correct=correct,
            cognitive_state=cognitive_state,
            explanation=explanation["summary"],
        )

        # Store update results
        updates.append({
            "concept": record["concept"],
            "old_mastery": old_p,
            "new_mastery": new_p,
            "mastery_delta": round(new_p - old_p, 4),
            "is_mastered": new_p >= MASTERY_THRESHOLD,
            "explanation": explanation["summary"],
        })

    return updates