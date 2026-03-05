# bkt/config.py
"""
BKT Default Parameters and Thresholds.
Aligned with team's ai-backend/app/core/config.py.
"""

# ── BKT Default Parameters ────────────────────────
BKT_DEFAULT_P_L = 0.3      # Prior mastery (initial assumption: 30%)
BKT_DEFAULT_P_T = 0.1      # Learn probability (transition)
BKT_DEFAULT_P_S = 0.1      # Slip probability (knows but answers wrong)
BKT_DEFAULT_P_G = 0.2      # Guess probability (doesn't know but answers right)

# ── Mastery Thresholds ─────────────────────────────
MASTERY_THRESHOLD = 0.8     # Concept considered "mastered" at >= 80%

# ── Affect Thresholds ─────────────────────────────
FRUSTRATION_HIGH = 0.7      # High frustration — trigger gentle intervention
FRUSTRATION_MED = 0.4       # Medium frustration — adjust tone
ENGAGEMENT_LOW = 0.3        # Low engagement — trigger challenge or re-engagement
BOREDOM_HIGH = 0.6          # High boredom — suggest harder problems
CONFUSION_HIGH = 0.5        # High confusion — simplify explanations

# ── Affect Modulation Multipliers ─────────────────
# These control how much cognitive state affects BKT parameters.
# Exact values from affect_fusion.py, documented here for reference:
ENGAGEMENT_LEARN_BOOST = 0.5    # +50% learn rate when fully engaged
FRUSTRATION_LEARN_PENALTY = 0.6 # -60% learn rate when fully frustrated
CONFUSION_SLIP_BOOST = 0.7      # +70% slip when fully confused
BOREDOM_GUESS_BOOST = 0.5       # +50% guess when fully bored
BOREDOM_LEARN_PENALTY = 0.4     # -40% learn rate when fully bored

# ── Default Cognitive State ───────────────────────
DEFAULT_COGNITIVE_STATE = {
    "engagement": 0.7,
    "frustration": 0.1,
    "confusion": 0.2,
    "boredom": 0.0,
}
