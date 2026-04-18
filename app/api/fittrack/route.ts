import { NextRequest, NextResponse } from "next/server";

type Goal = "muscle_gain" | "fat_loss" | "endurance";
type Level = "beginner" | "intermediate" | "advanced";
type Confidence = "Low" | "Medium" | "High";

type FitTrackRequest = {
  goal: Goal;
  level: Level;
  age: number;
};

type FitTrackResponse = {
  workout: string[];
  fatigue: number;
  explanation: string;
  nutrition: string;
  confidence: Confidence;
  title: string;
  inputs: FitTrackRequest;
  generatedAt: string;
};

const GOAL_LABELS: Record<Goal, string> = {
  muscle_gain: "Muscle Gain",
  fat_loss: "Fat Loss",
  endurance: "Endurance",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getWorkoutPlan(goal: Goal, level: Level): string[] {
  const templates: Record<Goal, Record<Level, string[]>> = {
    muscle_gain: {
      beginner: ["Goblet Squat", "Incline Dumbbell Press", "Seated Row", "Romanian Deadlift", "Plank"],
      intermediate: ["Barbell Squat", "Bench Press", "Lat Pulldown", "Bulgarian Split Squat", "Hanging Knee Raise"],
      advanced: ["Back Squat", "Weighted Bench Press", "Barbell Row", "Deadlift", "Farmer Carry"],
    },
    fat_loss: {
      beginner: ["Incline Walk", "Bodyweight Squat", "Push-Up", "Kettlebell Deadlift", "Bike Intervals"],
      intermediate: ["Rowing Intervals", "Dumbbell Thruster", "Walking Lunges", "Battle Ropes", "Core Circuit"],
      advanced: ["Sprint Intervals", "Complexes", "Sled Push", "Burpee Ladder", "High-Intensity Finisher"],
    },
    endurance: {
      beginner: ["Zone 2 Cardio", "Step-Ups", "Light Row", "Core Stability", "Mobility Flow"],
      intermediate: ["Tempo Run", "Bike Tempo Block", "Single-Leg Work", "Core Rotation", "Breathing Reset"],
      advanced: ["Threshold Intervals", "Plyometric Circuit", "Hill Sprints", "Assault Bike", "Recovery Walk"],
    },
  };

  return templates[goal][level];
}

function getFatigue(goal: Goal, level: Level, age: number): number {
  const base = goal === "muscle_gain" ? 58 : goal === "fat_loss" ? 66 : 54;
  const levelAdj = level === "beginner" ? 10 : level === "intermediate" ? 0 : -8;
  const ageAdj = age >= 45 ? 8 : age >= 35 ? 4 : 0;
  const goalAdj = goal === "endurance" ? -3 : goal === "fat_loss" ? 4 : 2;

  return clamp(base + levelAdj + ageAdj + goalAdj, 15, 95);
}

function getConfidence(goal: Goal, level: Level): Confidence {
  if (level === "advanced" && goal !== "fat_loss") return "High";
  if (level === "beginner") return "Medium";
  if (goal === "endurance") return "Medium";
  return "High";
}

function getExplanation(goal: Goal, level: Level, age: number, fatigue: number): string {
  const goalText =
    goal === "muscle_gain"
      ? "progressive overload and compound lifting"
      : goal === "fat_loss"
      ? "higher calorie expenditure and shorter rest periods"
      : "aerobic capacity and steady pacing";

  const levelText =
    level === "beginner"
      ? "simple movements and moderate volume"
      : level === "intermediate"
      ? "balanced exercise selection with enough challenge"
      : "higher-intensity work with tighter progression";

  const ageText =
    age >= 40
      ? "The plan slightly lowers overall stress to support recovery."
      : "The plan keeps enough intensity to drive adaptation.";

  const fatigueText =
    fatigue >= 70
      ? "Fatigue is relatively high, so recovery and form quality should be prioritized."
      : fatigue >= 50
      ? "Fatigue is moderate, so the session can stay productive without being excessive."
      : "Fatigue is low, so the user can handle a stronger stimulus today.";

  return `This plan is built around ${goalText}, using ${levelText}. ${ageText} ${fatigueText}`;
}

function getNutrition(goal: Goal, fatigue: number): string {
  const protein = fatigue >= 70 ? 40 : fatigue >= 50 ? 35 : 30;
  const base =
    goal === "muscle_gain"
      ? "Grilled chicken, rice, vegetables, Greek yogurt, and a fruit source."
      : goal === "fat_loss"
      ? "Salmon, greens, roasted vegetables, and a smaller portion of whole grains."
      : "Turkey wrap, banana, oats, and a hydration-focused recovery snack.";

  const carbFocus =
    goal === "endurance"
      ? "a higher-carb recovery meal"
      : goal === "fat_loss"
      ? "a balanced meal with controlled carbs"
      : "a protein-forward meal with moderate carbs";

  return `${base} Aim for about ${protein}g of protein and ${carbFocus} after the session.`;
}

function generatePlan(goal: Goal, level: Level, age: number): FitTrackResponse {
  const workout = getWorkoutPlan(goal, level);
  const fatigue = getFatigue(goal, level, age);
  const confidence = getConfidence(goal, level);

  const title =
    goal === "muscle_gain"
      ? "Hypertrophy Builder"
      : goal === "fat_loss"
      ? "Metabolic Burn"
      : "Endurance Engine";

  return {
    workout,
    fatigue,
    confidence,
    title,
    explanation: getExplanation(goal, level, age, fatigue),
    nutrition: getNutrition(goal, fatigue),
    inputs: { goal, level, age },
    generatedAt: new Date().toISOString(),
  };
}

function isGoal(value: unknown): value is Goal {
  return value === "muscle_gain" || value === "fat_loss" || value === "endurance";
}

function isLevel(value: unknown): value is Level {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function parseBody(body: unknown): FitTrackRequest | null {
  if (!body || typeof body !== "object") return null;

  const candidate = body as Record<string, unknown>;
  const goal = candidate.goal;
  const level = candidate.level;
  const age = candidate.age;

  if (!isGoal(goal) || !isLevel(level) || typeof age !== "number" || !Number.isFinite(age)) {
    return null;
  }

  return {
    goal,
    level,
    age: Math.round(clamp(age, 18, 65)),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "FitTrack API is running",
    supportedGoals: Object.keys(GOAL_LABELS),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(body);

    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body. Expected: { goal, level, age }",
        },
        { status: 400 }
      );
    }

    const result = generatePlan(parsed.goal, parsed.level, parsed.age);

    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to generate plan right now.",
      },
      { status: 500 }
    );
  }
}