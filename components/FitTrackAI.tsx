"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  Brain,
  Dumbbell,
  Flame,
  GraduationCap,
  HeartPulse,
  Loader2,
  Salad,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

type Goal = "muscle_gain" | "fat_loss" | "endurance";
type Level = "beginner" | "intermediate" | "advanced";
type Confidence = "Low" | "Medium" | "High";

type FitTrackApiResult = {
  workout: string[];
  fatigue: number;
  explanation: string;
  nutrition: string;
  confidence: Confidence;
  title: string;
  inputs: {
    goal: Goal;
    level: Level;
    age: number;
  };
  generatedAt: string;
  calories_burned: number;
  fatigue_score: number;
  fatigue_label: "Low" | "Moderate" | "High" | "Very High";
  recovery_ready: boolean;
  protein_target_g: number;
  experience_label: "Beginner" | "Intermediate" | "Advanced";
  workout_type: string;
  goal: Goal;
  summary: string;
  nutrition_tip: string;
  recovery_tip: string;
};

const GOAL_LABELS: Record<Goal, string> = {
  muscle_gain: "Muscle Gain",
  fat_loss: "Fat Loss",
  endurance: "Endurance",
};

const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const GOAL_STYLES: Record<Goal, string> = {
  muscle_gain: "from-cyan-500 to-blue-500",
  fat_loss: "from-emerald-400 to-lime-400",
  endurance: "from-orange-400 to-amber-300",
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function confidenceClass(confidence?: Confidence) {
  if (confidence === "High") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30";
  if (confidence === "Medium") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30";
  return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30";
}

function safeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeResult(
  result: FitTrackApiResult | null,
  goal: Goal,
  level: Level,
  age: number
): FitTrackApiResult | null {
  if (!result) return null;

  const workout = Array.isArray(result.workout) ? result.workout : [];
  const caloriesBurned = safeNumber(result.calories_burned, 0);
  const fatigueScore = safeNumber(result.fatigue_score, 0);
  const confidence = result.confidence ?? "Medium";

  return {
    ...result,
    workout,
    calories_burned: caloriesBurned,
    fatigue_score: fatigueScore,
    fatigue: Number.isFinite(safeNumber(result.fatigue)) ? safeNumber(result.fatigue) : fatigueScore,
    confidence,
    fatigue_label:
      result.fatigue_label ??
      (fatigueScore < 25 ? "Low" : fatigueScore < 50 ? "Moderate" : fatigueScore < 70 ? "High" : "Very High"),
    recovery_ready:
      typeof result.recovery_ready === "boolean" ? result.recovery_ready : fatigueScore < 60,
    protein_target_g: safeNumber(result.protein_target_g, 30),
    experience_label: result.experience_label ?? LEVEL_LABELS[level],
    workout_type:
      result.workout_type ??
      (goal === "muscle_gain" ? "Strength" : goal === "fat_loss" ? "HIIT" : "Cardio"),
    goal: result.goal ?? goal,
    summary: result.summary ?? "",
    nutrition_tip: result.nutrition_tip ?? result.nutrition ?? "",
    recovery_tip: result.recovery_tip ?? "",
    title: result.title ?? "AI Generated Plan",
    explanation: result.explanation ?? "",
    nutrition: result.nutrition ?? result.nutrition_tip ?? "",
    inputs: result.inputs ?? { goal, level, age },
    generatedAt: result.generatedAt ?? new Date().toISOString(),
  };
}

function ProgressRing({ value }: { value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-950/70 ring-1 ring-white/10">
      <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-white/10" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="fill-none stroke-cyan-400"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold text-white">{Math.round(value)}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Fatigue</div>
      </div>
    </div>
  );
}

export default function FitTrackAI() {
  const [goal, setGoal] = useState<Goal>("muscle_gain");
  const [level, setLevel] = useState<Level>("intermediate");
  const [age, setAge] = useState<number>(28);

  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [weightKg, setWeightKg] = useState<number>(78);
  const [heightM, setHeightM] = useState<number>(1.78);
  const [fatPercentage, setFatPercentage] = useState<number>(18.5);
  const [restingBpm, setRestingBpm] = useState<number>(62);
  const [avgBpm, setAvgBpm] = useState<number>(145);
  const [maxBpm, setMaxBpm] = useState<number>(182);
  const [hrvMs, setHrvMs] = useState<number>(55);
  const [sessionDurationHours, setSessionDurationHours] = useState<number>(1.0);
  const [workoutFrequencyDaysWeek, setWorkoutFrequencyDaysWeek] = useState<number>(4);
  const [waterIntakeLiters, setWaterIntakeLiters] = useState<number>(2.5);
  const [timeInGymMin, setTimeInGymMin] = useState<number>(75);
  const [idleTimeMin, setIdleTimeMin] = useState<number>(10);
  const [completionPct, setCompletionPct] = useState<number>(90);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [recoveryReady, setRecoveryReady] = useState<number>(1);
  const [workoutCompleted, setWorkoutCompleted] = useState<number>(1);
  const [proteinTargetG, setProteinTargetG] = useState<number>(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FitTrackApiResult | null>(null);

  const glow = useMemo(() => GOAL_STYLES[goal], [goal]);
  const safeResult = useMemo(
    () => normalizeResult(result, goal, level, age),
    [result, goal, level, age]
  );

  async function handleGenerate() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/fittrack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal,
          level,
          age,
          gender,
          weight_kg: weightKg,
          height_m: heightM,
          fat_percentage: fatPercentage,
          resting_bpm: restingBpm,
          avg_bpm: avgBpm,
          max_bpm: maxBpm,
          hrv_ms: hrvMs,
          hour_of_day: 7,
          workout_type: goal === "muscle_gain" ? "Strength" : goal === "fat_loss" ? "HIIT" : "Cardio",
          session_duration_hours: sessionDurationHours,
          workout_frequency_days_week: workoutFrequencyDaysWeek,
          water_intake_liters: waterIntakeLiters,
          time_in_gym_min: timeInGymMin,
          idle_time_min: idleTimeMin,
          completion_pct: completionPct,
          sleep_hours: sleepHours,
          fatigue_score: safeResult?.fatigue_score ?? 30,
          recovery_ready: recoveryReady,
          workout_completed: workoutCompleted,
          protein_target_g: proteinTargetG,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Failed to generate plan");
      }

      setResult(json.data as FitTrackApiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate a plan right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060816] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className={cn("absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br opacity-25 blur-3xl", glow)} />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-500/5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Fitness Demo
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">FitTrack AI</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Personalized workouts, fatigue-aware coaching, and recovery guidance in one clean dashboard.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[320px]">
            <StatPill icon={Dumbbell} label="Workout" value={GOAL_LABELS[goal]} />
            <StatPill icon={HeartPulse} label="Level" value={LEVEL_LABELS[level]} />
            <StatPill icon={Trophy} label="Age" value={String(age)} />
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Build your training plan</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter a few details and the assistant will generate a workout plan, fatigue score, and recovery recommendation.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <Brain className="h-4 w-4 text-cyan-300" />
                Backend connected
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <FieldCard title="Fitness Goal" icon={Target}>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as Goal)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                >
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="endurance">Endurance</option>
                </select>
              </FieldCard>

              <FieldCard title="Experience Level" icon={GraduationCap}>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </FieldCard>

              <FieldCard title="Age" icon={Activity}>
                <input
                  type="range"
                  min={18}
                  max={65}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                  <span>18</span>
                  <span className="font-medium text-white">{age}</span>
                  <span>65</span>
                </div>
              </FieldCard>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard title="Gender" icon={GraduationCap}>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "Male" | "Female")}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </FieldCard>

              <FieldCard title="Weight (kg)" icon={Activity}>
                <input
                  type="range"
                  min={40}
                  max={130}
                  step={1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{weightKg} kg</div>
              </FieldCard>

              <FieldCard title="Height (m)" icon={Activity}>
                <input
                  type="range"
                  min={1.5}
                  max={2.0}
                  step={0.01}
                  value={heightM}
                  onChange={(e) => setHeightM(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{heightM.toFixed(2)} m</div>
              </FieldCard>

              <FieldCard title="Body Fat %" icon={Target}>
                <input
                  type="range"
                  min={8}
                  max={40}
                  step={0.1}
                  value={fatPercentage}
                  onChange={(e) => setFatPercentage(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{fatPercentage.toFixed(1)}%</div>
              </FieldCard>

              <FieldCard title="Resting BPM" icon={HeartPulse}>
                <input
                  type="range"
                  min={45}
                  max={90}
                  step={1}
                  value={restingBpm}
                  onChange={(e) => setRestingBpm(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{restingBpm}</div>
              </FieldCard>

              <FieldCard title="Avg BPM" icon={HeartPulse}>
                <input
                  type="range"
                  min={106}
                  max={185}
                  step={1}
                  value={avgBpm}
                  onChange={(e) => setAvgBpm(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{avgBpm}</div>
              </FieldCard>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard title="Max BPM" icon={HeartPulse}>
                <input
                  type="range"
                  min={116}
                  max={202}
                  step={1}
                  value={maxBpm}
                  onChange={(e) => setMaxBpm(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{maxBpm}</div>
              </FieldCard>

              <FieldCard title="HRV (ms)" icon={HeartPulse}>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={1}
                  value={hrvMs}
                  onChange={(e) => setHrvMs(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{hrvMs} ms</div>
              </FieldCard>

              <FieldCard title="Session Duration" icon={Activity}>
                <input
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={sessionDurationHours}
                  onChange={(e) => setSessionDurationHours(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{sessionDurationHours.toFixed(1)} hrs</div>
              </FieldCard>

              <FieldCard title="Workout Frequency" icon={Target}>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={1}
                  value={workoutFrequencyDaysWeek}
                  onChange={(e) => setWorkoutFrequencyDaysWeek(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{workoutFrequencyDaysWeek} days/week</div>
              </FieldCard>

              <FieldCard title="Water Intake" icon={Salad}>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={waterIntakeLiters}
                  onChange={(e) => setWaterIntakeLiters(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{waterIntakeLiters.toFixed(1)} L</div>
              </FieldCard>

              <FieldCard title="Time in Gym" icon={Activity}>
                <input
                  type="range"
                  min={21}
                  max={141}
                  step={1}
                  value={timeInGymMin}
                  onChange={(e) => setTimeInGymMin(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{timeInGymMin} min</div>
              </FieldCard>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard title="Idle Time" icon={Activity}>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={idleTimeMin}
                  onChange={(e) => setIdleTimeMin(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{idleTimeMin} min</div>
              </FieldCard>

              <FieldCard title="Completion %" icon={BadgeCheck}>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={completionPct}
                  onChange={(e) => setCompletionPct(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{completionPct}%</div>
              </FieldCard>

              <FieldCard title="Sleep Hours" icon={HeartPulse}>
                <input
                  type="range"
                  min={4}
                  max={10}
                  step={0.1}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{sleepHours.toFixed(1)} hrs</div>
              </FieldCard>

              <FieldCard title="Recovery Ready" icon={Target}>
                <select
                  value={recoveryReady}
                  onChange={(e) => setRecoveryReady(Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"
                >
                  <option value={1}>Yes</option>
                  <option value={0}>No</option>
                </select>
              </FieldCard>

              <FieldCard title="Workout Completed" icon={Target}>
                <select
                  value={workoutCompleted}
                  onChange={(e) => setWorkoutCompleted(Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"
                >
                  <option value={1}>Yes</option>
                  <option value={0}>No</option>
                </select>
              </FieldCard>

              <FieldCard title="Protein Target (g)" icon={Salad}>
                <input
                  type="range"
                  min={20}
                  max={60}
                  step={1}
                  value={proteinTargetG}
                  onChange={(e) => setProteinTargetG(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{proteinTargetG} g</div>
              </FieldCard>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400 px-5 py-3 font-medium text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {loading ? "Generating plan..." : "Generate Plan"}
              </button>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                <BadgeCheck className="h-4 w-4 text-emerald-300" />
                Personalized outputs from backend
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {safeResult ? (
                <motion.div
                  key={`${safeResult.goal}-${safeResult.inputs?.level ?? level}-${safeResult.inputs?.age ?? age}-${safeResult.generatedAt}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                  className="mt-6 grid gap-4"
                >
                  <div className="rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-xl shadow-black/20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Session Output</p>
                        <h3 className="mt-2 text-2xl font-semibold">{safeResult.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Confidence:{" "}
                          <span
                            className={cn(
                              "ml-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              confidenceClass(safeResult.confidence)
                            )}
                          >
                            {safeResult.confidence}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                        <div className="flex items-center gap-2 text-cyan-300">
                          <Flame className="h-4 w-4" />
                          Fatigue score
                        </div>
                        <div className="mt-2 text-3xl font-semibold">{Math.round(safeResult.fatigue_score)}/100</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <GlassCard title="Workout Plan" icon={Dumbbell}>
                      <ul className="mt-4 space-y-3">
                        {(safeResult.workout ?? []).map((exercise, idx) => (
                          <li key={exercise} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-200">
                              {idx + 1}
                            </div>
                            <span className="text-sm text-slate-100">{exercise}</span>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>

                    <GlassCard title="Fatigue Score" icon={Flame}>
                      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <ProgressRing value={safeResult.fatigue_score} />
                        <div className="flex-1 space-y-3 text-sm text-slate-300 sm:pl-4">
                          <p>
                            This score estimates how demanding the workout should feel based on your goal, experience level, and recovery inputs.
                          </p>
                          <div className="h-3 rounded-full bg-white/10">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400"
                              style={{ width: `${safeResult.fatigue_score}%` }}
                            />
                          </div>
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Higher score = more recovery needed</p>
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                            Recovery status:{" "}
                            <span className="font-semibold">{safeResult.recovery_ready ? "Ready" : "Needs recovery"}</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <GlassCard title="AI Explanation" icon={Brain}>
                      <p className="mt-4 text-sm leading-6 text-slate-300">{safeResult.explanation}</p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Adaptive plan logic
                      </div>
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        Summary: {safeResult.summary}
                      </div>
                    </GlassCard>

                    <GlassCard title="Nutrition Recommendation" icon={Salad}>
                      <p className="mt-4 text-sm leading-6 text-slate-300">{safeResult.nutrition_tip}</p>
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        Protein target: <span className="font-semibold text-white">{safeResult.protein_target_g}g</span>
                      </div>
                      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        Recovery tip: {safeResult.recovery_tip}
                      </div>
                    </GlassCard>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label="Calories Burned" value={`${Math.round(safeResult.calories_burned)}`} />
                    <MiniMetric label="Fatigue Label" value={safeResult.fatigue_label} />
                    <MiniMetric label="Workout Type" value={safeResult.workout_type} />
                    <MiniMetric label="Experience" value={safeResult.experience_label} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-300"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <Sparkles className="h-8 w-8 text-cyan-300" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">Your plan will appear here</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    Choose a goal, skill level, and recovery details, then generate a personalized workout plan with fatigue scoring,
                    AI explanations, and nutrition guidance.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <aside className="space-y-6">
            <GlassPanel title="Why FitTrack AI?" icon={Trophy}>
              <p className="text-sm leading-6 text-slate-300">
                This demo is built like a real product: it accepts user input, generates a training recommendation, explains the logic,
                and returns recovery guidance. That makes it easy to present as an AI-integrated business solution rather than just a model.
              </p>
            </GlassPanel>

            <GlassPanel title="Demo Highlights" icon={HeartPulse}>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Tailored workout plan based on goal and level
                </li>
                <li className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Fatigue score visualized for quick decision making
                </li>
                <li className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Plain-language AI explanation for governance
                </li>
                <li className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  Post-session nutrition recommendation
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel title="Product Framing" icon={Activity}>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <Row label="Business Problem" value="People need smarter workout guidance" />
                <Row label="ML Role" value="Predict plan + fatigue + recovery" />
                <Row label="Governance" value="Explain recommendations clearly" />
                <Row label="Value" value="More personalized, safer training" />
              </div>
            </GlassPanel>
          </aside>
        </main>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left shadow-lg shadow-black/20 backdrop-blur">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function FieldCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Icon className="h-4 w-4 text-cyan-300" />
        {title}
      </div>
      {children}
    </div>
  );
}

function GlassCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-cyan-300" />
        {title}
      </div>
      {children}
    </div>
  );
}

function GlassPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-orange-300" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="max-w-[55%] text-right text-sm text-slate-200">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}