import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

type Goal = "muscle_gain" | "fat_loss" | "endurance";
type Level = "beginner" | "intermediate" | "advanced";

function isGoal(value: unknown): value is Goal {
  return value === "muscle_gain" || value === "fat_loss" || value === "endurance";
}

function isLevel(value: unknown): value is Level {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;

  const candidate = body as Record<string, unknown>;
  if (!isGoal(candidate.goal) || !isLevel(candidate.level) || typeof candidate.age !== "number") {
    return null;
  }

  return {
    goal: candidate.goal,
    level: candidate.level,
    age: clamp(candidate.age, 18, 65),
    gender: candidate.gender === "Female" ? "Female" : "Male",
    weight_kg: typeof candidate.weight_kg === "number" ? candidate.weight_kg : 78,
    height_m: typeof candidate.height_m === "number" ? candidate.height_m : 1.78,
    bmi: typeof candidate.bmi === "number" ? candidate.bmi : null,
    fat_percentage: typeof candidate.fat_percentage === "number" ? candidate.fat_percentage : 18.5,
    resting_bpm: typeof candidate.resting_bpm === "number" ? candidate.resting_bpm : 62,
    avg_bpm: typeof candidate.avg_bpm === "number" ? candidate.avg_bpm : 145,
    max_bpm: typeof candidate.max_bpm === "number" ? candidate.max_bpm : 182,
    hrv_ms: typeof candidate.hrv_ms === "number" ? candidate.hrv_ms : 55,
    hour_of_day: typeof candidate.hour_of_day === "number" ? candidate.hour_of_day : 7,
    workout_type: typeof candidate.workout_type === "string" ? candidate.workout_type : "Strength",
    session_duration_hours:
      typeof candidate.session_duration_hours === "number" ? candidate.session_duration_hours : 1,
    workout_frequency_days_week:
      typeof candidate.workout_frequency_days_week === "number" ? candidate.workout_frequency_days_week : 4,
    water_intake_liters: typeof candidate.water_intake_liters === "number" ? candidate.water_intake_liters : 2.5,
    time_in_gym_min: typeof candidate.time_in_gym_min === "number" ? candidate.time_in_gym_min : 75,
    idle_time_min: typeof candidate.idle_time_min === "number" ? candidate.idle_time_min : 10,
    completion_pct: typeof candidate.completion_pct === "number" ? candidate.completion_pct : 90,
    sleep_hours: typeof candidate.sleep_hours === "number" ? candidate.sleep_hours : 7,
    fatigue_score: typeof candidate.fatigue_score === "number" ? candidate.fatigue_score : 30,
    recovery_ready: typeof candidate.recovery_ready === "number" ? candidate.recovery_ready : 1,
    workout_completed: typeof candidate.workout_completed === "number" ? candidate.workout_completed : 1,
    protein_target_g: typeof candidate.protein_target_g === "number" ? candidate.protein_target_g : 30,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "FitTrack API proxy is running",
    backend: PYTHON_API_URL,
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(body);

    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const response = await fetch(`${PYTHON_API_URL}/api/v1/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed),
    });

    const text = await response.text();

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.detail || data?.error || `Prediction failed (${response.status})`,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("FitTrack proxy error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to reach model backend",
      },
      { status: 500 }
    );
  }
}