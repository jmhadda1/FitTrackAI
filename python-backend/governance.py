"""Rule-based governance, risk-signalling and bias-mitigation layer.

This module sits between the ML prediction and the response. It produces:

  - risk_flags: structured, deterministic warnings the UI can render as chips.
  - disclaimers: legal/ethical notices that always accompany a recommendation.
  - governance_status: overall PASS / REVIEW / BLOCK signal.
  - data_provenance: training metadata so the user can see where outputs come from.
  - bias_notes: known dataset / model biases relevant to the current request.

The layer is intentionally LLM-free. Rule-based governance is auditable, fast,
deterministic and cheap. The LLM layer (see llm.py) consumes this report to
produce a natural-language narrative; it never overrides governance decisions.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Literal


GovernanceStatus = Literal["pass", "review", "block"]
RiskSeverity = Literal["info", "caution", "warning", "block"]


@dataclass
class RiskFlag:
    code: str
    severity: RiskSeverity
    title: str
    detail: str
    category: str  # safety | data_quality | distribution | ethics


@dataclass
class GovernanceReport:
    status: GovernanceStatus
    summary: str
    risk_flags: list[RiskFlag] = field(default_factory=list)
    disclaimers: list[str] = field(default_factory=list)
    bias_notes: list[str] = field(default_factory=list)
    data_provenance: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "summary": self.summary,
            "risk_flags": [asdict(f) for f in self.risk_flags],
            "disclaimers": self.disclaimers,
            "bias_notes": self.bias_notes,
            "data_provenance": self.data_provenance,
        }


# Training distribution facts. These mirror calories_model_metadata.json plus
# what we know about the source dataset's collection.
TRAIN_AGE_RANGE = (18, 65)
TRAIN_BMI_PLAUSIBLE = (15.0, 45.0)
TRAIN_HRV_RANGE = (10.0, 120.0)
TRAIN_SAMPLE_SIZE = 2_000


STANDARD_DISCLAIMERS = [
    "FitTrack AI provides general fitness guidance and is not medical advice.",
    "Consult a qualified clinician before starting any new exercise programme.",
    "Stop training and seek medical help if you experience pain, dizziness or chest discomfort.",
]


def _bmi(weight_kg: float, height_m: float, fallback: float | None) -> float:
    if fallback is not None and fallback > 0:
        return float(fallback)
    if height_m <= 0:
        return 0.0
    return weight_kg / (height_m ** 2)


def evaluate(payload, prediction: dict) -> GovernanceReport:
    """Inspect the request + ML prediction and emit a structured report.

    `payload` is the PredictRequest pydantic model (see main.py); accessed
    attribute-style. `prediction` is the dict produced by build_response *before*
    the governance / LLM layer runs.
    """
    flags: list[RiskFlag] = []

    age = int(getattr(payload, "age", 0) or 0)
    weight = float(getattr(payload, "weight_kg", 0.0) or 0.0)
    height = float(getattr(payload, "height_m", 0.0) or 0.0)
    bmi_request = getattr(payload, "bmi", None)
    bmi = _bmi(weight, height, bmi_request)
    avg_bpm = int(getattr(payload, "avg_bpm", 0) or 0)
    max_bpm = int(getattr(payload, "max_bpm", 0) or 0)
    resting_bpm = int(getattr(payload, "resting_bpm", 0) or 0)
    hrv = float(getattr(payload, "hrv_ms", 0.0) or 0.0)
    sleep = float(getattr(payload, "sleep_hours", 0.0) or 0.0)
    duration = float(getattr(payload, "session_duration_hours", 0.0) or 0.0)
    completion = float(getattr(payload, "completion_pct", 0.0) or 0.0)
    recovery_ready = int(getattr(payload, "recovery_ready", 1) or 0)
    workout_completed = int(getattr(payload, "workout_completed", 1) or 0)
    level = str(getattr(payload, "level", "") or "").lower()

    fatigue = float(prediction.get("fatigue_score", 0) or 0)
    calories = float(prediction.get("calories_burned", 0) or 0)

    if age < TRAIN_AGE_RANGE[0] or age > TRAIN_AGE_RANGE[1]:
        flags.append(RiskFlag(
            code="ood_age",
            severity="warning",
            title="Out-of-distribution age",
            detail=(
                f"Model was trained on athletes aged {TRAIN_AGE_RANGE[0]}-{TRAIN_AGE_RANGE[1]}; "
                f"this request has age={age}. Predictions outside this range are extrapolations."
            ),
            category="distribution",
        ))

    if bmi < TRAIN_BMI_PLAUSIBLE[0] or bmi > TRAIN_BMI_PLAUSIBLE[1]:
        flags.append(RiskFlag(
            code="bmi_extreme",
            severity="warning",
            title="BMI outside plausible range",
            detail=(
                f"Computed BMI={bmi:.1f}. Use clinical judgement; the model has limited "
                f"data outside BMI {TRAIN_BMI_PLAUSIBLE[0]}-{TRAIN_BMI_PLAUSIBLE[1]}."
            ),
            category="distribution",
        ))
    elif bmi >= 30:
        flags.append(RiskFlag(
            code="bmi_obese",
            severity="caution",
            title="Elevated BMI",
            detail=(
                f"BMI {bmi:.1f} is in the obese range. Prefer low-impact "
                "movement patterns and prioritise progression over volume."
            ),
            category="safety",
        ))

    if avg_bpm and max_bpm and avg_bpm > max_bpm:
        flags.append(RiskFlag(
            code="bpm_inconsistent",
            severity="warning",
            title="Heart-rate inputs are inconsistent",
            detail=(
                f"avg_bpm={avg_bpm} is higher than max_bpm={max_bpm}. "
                "Re-check the wearable data before relying on this session."
            ),
            category="data_quality",
        ))
    if resting_bpm and avg_bpm and resting_bpm > avg_bpm:
        flags.append(RiskFlag(
            code="resting_bpm_inconsistent",
            severity="caution",
            title="Resting BPM exceeds average BPM",
            detail="Probably a logging error; verify your monitor was paired correctly.",
            category="data_quality",
        ))

    if hrv and (hrv < TRAIN_HRV_RANGE[0] or hrv > TRAIN_HRV_RANGE[1]):
        flags.append(RiskFlag(
            code="hrv_extreme",
            severity="caution",
            title="HRV outside expected range",
            detail=(
                f"HRV={hrv:.0f} ms looks unusual. Confirm the reading; "
                "very low HRV combined with high fatigue is a strong recovery signal."
            ),
            category="data_quality",
        ))

    if sleep and sleep < 5.5:
        flags.append(RiskFlag(
            code="sleep_low",
            severity="caution",
            title="Sleep below 5.5 hours",
            detail="Strength and cognition both degrade after a short night. Consider a recovery-focused session.",
            category="safety",
        ))

    if duration and duration > 2.0:
        flags.append(RiskFlag(
            code="long_session",
            severity="caution",
            title="Long planned session",
            detail=f"Session length {duration:.1f}h exceeds the bulk of training data. Watch for late-session form breakdown.",
            category="safety",
        ))

    if fatigue >= 80:
        flags.append(RiskFlag(
            code="fatigue_very_high",
            severity="warning",
            title="Predicted fatigue is very high",
            detail="Strongly consider a deload or recovery day instead of pushing this session.",
            category="safety",
        ))
    elif fatigue >= 65:
        flags.append(RiskFlag(
            code="fatigue_high",
            severity="caution",
            title="Predicted fatigue is high",
            detail="Reduce loads, lengthen rest periods, and stop if quality drops.",
            category="safety",
        ))

    if level == "advanced" and recovery_ready == 0 and fatigue >= 60:
        flags.append(RiskFlag(
            code="advanced_undercooked",
            severity="warning",
            title="Advanced load + flagged recovery",
            detail="You have selected advanced volume while marking yourself not recovery-ready. Down-shift today.",
            category="safety",
        ))

    if completion and completion < 60 and workout_completed == 1:
        flags.append(RiskFlag(
            code="low_completion",
            severity="info",
            title="Low completion despite workout marked complete",
            detail="If most of the planned work was skipped, log the session as incomplete so future plans calibrate correctly.",
            category="data_quality",
        ))

    if calories and (calories < 80 or calories > 1500):
        flags.append(RiskFlag(
            code="calories_outlier",
            severity="caution",
            title="Calorie estimate outside typical range",
            detail=f"Predicted {calories:.0f} kcal. Treat as a directional estimate, not a measurement.",
            category="distribution",
        ))

    bias_notes = [
        "Training data uses binary gender (Male / Female). Non-binary identities are not represented; the recommendation will not change with gender selection beyond what the model's drop_first(Female) one-hot captures.",
        "Sample size is {n} sessions, weighted toward intermediate-level athletes. Beginners and advanced athletes are under-represented at the extremes.".format(n=TRAIN_SAMPLE_SIZE),
        "The model predicts calories_burned; it does not account for individual medical conditions, medications, or pregnancy.",
        "Workout-type categories are limited to those the model saw at training time (Cardio, CrossFit, HIIT, Strength, Yoga). Niche modalities default to the Cardio reference category.",
    ]

    if any(f.severity in ("warning", "block") for f in flags):
        status: GovernanceStatus = "review"
        summary = "Recommendation released, but the system flagged conditions that warrant a second look. See risk flags below."
    elif flags:
        status = "pass"
        summary = "Recommendation passed governance with minor cautions noted."
    else:
        status = "pass"
        summary = "Recommendation passed governance with no active risk flags."

    if any(f.code == "advanced_undercooked" for f in flags) and fatigue >= 80:
        status = "block"
        summary = "System recommends NOT executing this session as planned. Reduce intensity or rest."

    provenance = {
        "model": "RandomForestRegressor (scikit-learn)",
        "model_artifact": "calories_model.joblib",
        "training_sample_size": TRAIN_SAMPLE_SIZE,
        "training_split": "80 / 20 train-test",
        "test_metrics": {
            "MAE_kcal": 44.3,
            "RMSE_kcal": 62.9,
            "R2": 0.936,
        },
        "feature_count": 31,
        "rules_engine_version": "fittrack.governance/2026.04.29",
    }

    return GovernanceReport(
        status=status,
        summary=summary,
        risk_flags=flags,
        disclaimers=list(STANDARD_DISCLAIMERS),
        bias_notes=bias_notes,
        data_provenance=provenance,
    )
