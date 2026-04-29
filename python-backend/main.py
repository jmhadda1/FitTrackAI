from pathlib import Path
import json
import traceback

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from governance import evaluate as evaluate_governance
from llm import generate_explanation

app = FastAPI(title="FitTrack Model API", version="4.1.0")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "calories_model.joblib"
META_PATH = BASE_DIR / "calories_model_metadata.json"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Missing model file: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

metadata = {}
if META_PATH.exists():
    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

FEATURE_COLUMNS = metadata.get("feature_columns") or list(getattr(model, "feature_names_in_", []))


class PredictRequest(BaseModel):
    goal: str = Field(default="General Fitness")
    level: str = Field(default="intermediate")
    age: int = Field(default=28, ge=18, le=65)

    gender: str = Field(default="Male")
    weight_kg: float = Field(default=78.0)
    height_m: float = Field(default=1.78)
    bmi: float | None = Field(default=None)
    fat_percentage: float = Field(default=18.5)

    resting_bpm: int = Field(default=62)
    avg_bpm: int = Field(default=145)
    max_bpm: int = Field(default=182)
    hrv_ms: float = Field(default=55.0)
    hour_of_day: int = Field(default=7)

    workout_type: str = Field(default="Strength")
    session_duration_hours: float = Field(default=1.0)
    workout_frequency_days_week: int = Field(default=4)
    water_intake_liters: float = Field(default=2.5)
    time_in_gym_min: int = Field(default=75)
    idle_time_min: int = Field(default=10)
    completion_pct: float = Field(default=90.0)
    sleep_hours: float = Field(default=7.0)

    fatigue_score: float = Field(default=30.0)
    recovery_ready: int = Field(default=1)
    workout_completed: int = Field(default=1)
    protein_target_g: int = Field(default=30)


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def get_workout_plan(goal: str, level: str) -> list[str]:
    goal = goal.lower()
    level = level.lower()

    plans = {
        "muscle_gain": {
            "beginner": ["Goblet Squat", "Incline Dumbbell Press", "Seated Row", "Romanian Deadlift", "Plank"],
            "intermediate": ["Barbell Squat", "Bench Press", "Lat Pulldown", "Bulgarian Split Squat", "Hanging Knee Raise"],
            "advanced": ["Back Squat", "Weighted Bench Press", "Barbell Row", "Deadlift", "Farmer Carry"],
        },
        "fat_loss": {
            "beginner": ["Incline Walk", "Bodyweight Squat", "Push-Up", "Kettlebell Deadlift", "Bike Intervals"],
            "intermediate": ["Rowing Intervals", "Dumbbell Thruster", "Walking Lunges", "Battle Ropes", "Core Circuit"],
            "advanced": ["Sprint Intervals", "Complexes", "Sled Push", "Burpee Ladder", "High-Intensity Finisher"],
        },
        "endurance": {
            "beginner": ["Zone 2 Cardio", "Step-Ups", "Light Row", "Core Stability", "Mobility Flow"],
            "intermediate": ["Tempo Run", "Bike Tempo Block", "Single-Leg Work", "Core Rotation", "Breathing Reset"],
            "advanced": ["Threshold Intervals", "Plyometric Circuit", "Hill Sprints", "Assault Bike", "Recovery Walk"],
        },
    }

    goal_plan = plans.get(goal, plans["muscle_gain"])
    return goal_plan.get(level, goal_plan["intermediate"])

def map_experience_label(level: str) -> str:
    level = level.lower()
    if level == "beginner":
        return "Beginner"
    if level == "advanced":
        return "Advanced"
    return "Intermediate"


def map_workout_type(goal: str) -> str:
    goal_lower = goal.lower()
    if goal_lower == "muscle_gain":
        return "Strength"
    if goal_lower == "fat_loss":
        return "HIIT"
    if goal_lower == "endurance":
        return "Cardio"
    return "General Fitness"


# Mappings from frontend-facing values to the labels the model was trained on.
# Training used: goal in {Flexibility, General Fitness, Muscle Gain, Weight Loss},
# workout_type in {Cardio, CrossFit, HIIT, Strength, Yoga} (Cardio is the drop_first
# reference), gender in {Male, Female} (Female is the drop_first reference), and
# experience_level as an ordinal integer. Without these mappings the one-hot
# columns silently end up all zero after reindex().
GOAL_TO_TRAINING_LABEL = {
    "muscle_gain": "Muscle Gain",
    "fat_loss": "Weight Loss",
    "endurance": "General Fitness",
    "flexibility": "Flexibility",
}

WORKOUT_TYPE_TO_TRAINING_LABEL = {
    "strength": "Strength",
    "hiit": "HIIT",
    "cardio": "Cardio",
    "crossfit": "CrossFit",
    "yoga": "Yoga",
}

EXPERIENCE_LEVEL_ORDINAL = {
    "beginner": 1,
    "intermediate": 2,
    "advanced": 3,
}


def build_feature_frame(payload: PredictRequest) -> tuple[pd.DataFrame, float]:
    bmi = payload.bmi if payload.bmi is not None else payload.weight_kg / (payload.height_m ** 2)

    goal_label = GOAL_TO_TRAINING_LABEL.get(payload.goal.lower(), "General Fitness")
    workout_type_label = WORKOUT_TYPE_TO_TRAINING_LABEL.get(
        payload.workout_type.lower(), payload.workout_type
    )
    experience_ordinal = EXPERIENCE_LEVEL_ORDINAL.get(payload.level.lower(), 2)
    gender_label = "Male" if payload.gender.lower() == "male" else "Female"

    base = {
        "age": payload.age,
        "gender": gender_label,
        "weight_kg": payload.weight_kg,
        "height_m": payload.height_m,
        "bmi": bmi,
        "fat_percentage": payload.fat_percentage,
        "experience_level": experience_ordinal,
        "goal": goal_label,
        "resting_bpm": payload.resting_bpm,
        "avg_bpm": payload.avg_bpm,
        "max_bpm": payload.max_bpm,
        "hrv_ms": payload.hrv_ms,
        "hour_of_day": payload.hour_of_day,
        "workout_type": workout_type_label,
        "session_duration_hours": payload.session_duration_hours,
        "workout_frequency_days_week": payload.workout_frequency_days_week,
        "water_intake_liters": payload.water_intake_liters,
        "time_in_gym_min": payload.time_in_gym_min,
        "idle_time_min": payload.idle_time_min,
        "completion_pct": payload.completion_pct,
        "sleep_hours": payload.sleep_hours,
        "fatigue_score": payload.fatigue_score,
        "recovery_ready": payload.recovery_ready,
        "workout_completed": payload.workout_completed,
        "protein_target_g": payload.protein_target_g,
    }

    df = pd.DataFrame([base])

    if FEATURE_COLUMNS:
        categorical_cols = [c for c in ("gender", "goal", "workout_type") if c in df.columns]
        encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=True)
        encoded = encoded.reindex(columns=FEATURE_COLUMNS, fill_value=0)
        return encoded, bmi

    return df, bmi


def fallback_calories(payload: PredictRequest) -> float:
    goal_bonus = {
        "muscle_gain": 65,
        "fat_loss": 90,
        "endurance": 75,
    }.get(payload.goal, 55)

    level_bonus = {
        "beginner": 25,
        "intermediate": 55,
        "advanced": 85,
    }.get(payload.level, 40)

    duration_bonus = payload.session_duration_hours * 120
    hr_bonus = max(0, (payload.avg_bpm - 100) * 1.2)
    age_penalty = max(0, (payload.age - 30) * 1.6)
    idle_penalty = payload.idle_time_min * 0.5

    return float(
        clamp(
            180 + goal_bonus + level_bonus + duration_bonus + hr_bonus - age_penalty - idle_penalty,
            150,
            1200,
        )
    )


def predict_calories(frame: pd.DataFrame, payload: PredictRequest) -> float:
    try:
        return float(model.predict(frame)[0])
    except Exception:
        try:
            return float(model.predict(frame.to_numpy())[0])
        except Exception:
            return fallback_calories(payload)


def compute_fatigue(calories_burned: float, payload: PredictRequest, bmi: float) -> int:
    calories_signal = clamp(calories_burned / 850.0, 0, 1)
    duration_signal = clamp(payload.session_duration_hours / 2.0, 0, 1)
    idle_signal = clamp(payload.idle_time_min / 60.0, 0, 1)
    sleep_signal = clamp((8.0 - payload.sleep_hours) / 4.0, 0, 1)
    hrv_signal = clamp((65.0 - payload.hrv_ms) / 45.0, 0, 1)
    completion_signal = clamp(payload.completion_pct / 100.0, 0, 1)
    age_signal = clamp((payload.age - 18) / 47.0, 0, 1)
    recovery_signal = 0.0 if payload.recovery_ready else 1.0

    experience_signal = {
        "beginner": 0.24,
        "intermediate": 0.12,
        "advanced": 0.00,
    }.get(payload.level, 0.12)

    bmi_signal = 0.0
    if bmi >= 30:
        bmi_signal = 0.08
    elif bmi >= 25:
        bmi_signal = 0.04
    elif bmi <= 20:
        bmi_signal = -0.02

    fatigue = 100.0 * (
        0.23 * calories_signal
        + 0.16 * duration_signal
        + 0.12 * idle_signal
        + 0.15 * sleep_signal
        + 0.15 * hrv_signal
        + 0.07 * completion_signal
        + 0.05 * age_signal
        + 0.07 * experience_signal
        + 0.05 * recovery_signal
        + 0.02 * bmi_signal
    )

    if payload.workout_completed == 0:
        fatigue += 5

    return int(round(clamp(fatigue, 0, 100)))


def fatigue_label(score: int) -> str:
    if score < 25:
        return "Low"
    if score < 50:
        return "Moderate"
    if score < 70:
        return "High"
    return "Very High"


def get_explanation(payload: PredictRequest, fatigue: int, calories_burned: float) -> str:
    goal_text = {
        "muscle_gain": "progressive overload and compound lifting",
        "fat_loss": "higher calorie expenditure and shorter rest periods",
        "endurance": "aerobic capacity and steady pacing",
    }.get(payload.goal, "general training balance")

    level_text = {
        "beginner": "simple movements and moderate volume",
        "intermediate": "balanced exercise selection with enough challenge",
        "advanced": "higher-intensity work with tighter progression",
    }.get(payload.level, "balanced exercise selection")

    recovery_text = (
        "Fatigue is high, so recovery and form quality should be prioritized."
        if fatigue >= 70
        else "Fatigue is moderate, so the session should stay productive without being excessive."
        if fatigue >= 50
        else "Fatigue is low, so the user can handle a stronger stimulus today."
    )

    return (
        f"This plan uses {goal_text} with {level_text}. "
        f"Estimated calorie burn is {round(calories_burned, 1)} kcal. "
        f"{recovery_text}"
    )


def get_nutrition_tip(payload: PredictRequest, calories_burned: float, protein_target_g: int) -> str:
    if payload.goal == "muscle_gain":
        base = "High protein meal (chicken, rice, vegetables)"
    elif payload.goal == "fat_loss":
        base = "Balanced meal (lean protein + vegetables)"
    else:
        base = "Carb-focused recovery meal (oats, fruit, protein)"

    return f"{base}. Aim for about {protein_target_g}g of protein after your workout."


def get_recovery_tip(fatigue: int) -> str:
    if fatigue >= 75:
        return "Take recovery seriously today: sleep, hydrate, and keep movement light."
    if fatigue >= 55:
        return "You trained hard. Focus on hydration, protein, and a controlled next session."
    return "You look ready for another session, but keep intensity controlled."


def build_response(payload: PredictRequest) -> dict:
    frame, bmi = build_feature_frame(payload)
    calories_burned = predict_calories(frame, payload)
    fatigue = compute_fatigue(calories_burned, payload, bmi)
    label = fatigue_label(fatigue)

    protein_target = int(
        clamp(
            round(25 + (calories_burned / 30.0) + (6 if payload.goal == "muscle_gain" else 0)),
            25,
            55,
        )
    )

    experience_label = map_experience_label(payload.level)
    workout_type = map_workout_type(payload.goal)
    workout = get_workout_plan(payload.goal, payload.level)
    confidence = "High" if fatigue < 45 else "Medium" if fatigue < 70 else "Low"

    base_response = {
        "workout": workout,
        "calories_burned": round(calories_burned, 1),
        "bmi": round(bmi, 1),
        "fatigue_score": float(fatigue),
        "fatigue_label": label,
        "recovery_ready": fatigue < 60,
        "protein_target_g": protein_target,
        "experience_label": experience_label,
        "workout_type": workout_type,
        "goal": payload.goal,
        "summary": f"Estimated {round(calories_burned, 1)} calories burned. Fatigue is {label.lower()}.",
        "nutrition_tip": get_nutrition_tip(payload, calories_burned, protein_target),
        "recovery_tip": get_recovery_tip(fatigue),
        "fatigue": float(fatigue),
        "explanation": get_explanation(payload, fatigue, calories_burned),
        "nutrition": get_nutrition_tip(payload, calories_burned, protein_target),
        "title": "AI Generated Plan",
        "confidence": confidence,
        "inputs": {
            "goal": payload.goal,
            "level": payload.level,
            "age": payload.age,
        },
    }

    governance_report = evaluate_governance(payload, base_response).to_dict()
    llm_payload = generate_explanation(payload, base_response, governance_report)

    base_response["governance"] = governance_report
    base_response["risk_flags"] = governance_report["risk_flags"]
    base_response["disclaimers"] = governance_report["disclaimers"]
    base_response["bias_notes"] = governance_report["bias_notes"]
    base_response["data_provenance"] = governance_report["data_provenance"]
    base_response["governance_status"] = governance_report["status"]
    base_response["governance_summary"] = governance_report["summary"]
    base_response["llm_explanation"] = llm_payload

    if governance_report["status"] == "block":
        base_response["confidence"] = "Low"
        base_response["title"] = "Plan held for review"

    return base_response


@app.get("/")
def root():
    return {
        "ok": True,
        "message": "FitTrack model API running",
        "model_loaded": True,
        "feature_columns": len(FEATURE_COLUMNS) if FEATURE_COLUMNS else 0,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/v1/predict")
def predict(payload: PredictRequest):
    try:
        return build_response(payload)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))