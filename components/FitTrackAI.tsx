"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  Brain,
  ChevronRight,
  Dumbbell,
  Flame,
  GraduationCap,
  HeartPulse,
  Loader2,
  Salad,
  Sparkles,
  Target,
  Trophy,
  Wind,
  RotateCcw,
  Zap,
  ShieldCheck,
  Database,
  TrendingUp,
  AlertTriangle,
  Info,
  CircleAlert,
  Scale,
  ScrollText,
} from "lucide-react";

type Goal = "muscle_gain" | "fat_loss" | "endurance";
type Level = "beginner" | "intermediate" | "advanced";
type Confidence = "Low" | "Medium" | "High";

type GovernanceStatus = "pass" | "review" | "block";
type RiskSeverity = "info" | "caution" | "warning" | "block";

type RiskFlag = {
  code: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  category: string;
};

type LlmExplanation = {
  explanation: string;
  headline: string;
  risk_acknowledgement: string | null;
  confidence_caveat: string;
  provider: string;
  elapsed_ms: number;
};

type DataProvenance = {
  model?: string;
  model_artifact?: string;
  training_sample_size?: number;
  training_split?: string;
  test_metrics?: { MAE_kcal?: number; RMSE_kcal?: number; R2?: number };
  feature_count?: number;
  rules_engine_version?: string;
};

type FitTrackApiResult = {
  workout: string[];
  fatigue: number;
  explanation: string;
  nutrition: string;
  confidence: Confidence;
  title: string;
  inputs: { goal: Goal; level: Level; age: number };
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
  governance_status?: GovernanceStatus;
  governance_summary?: string;
  risk_flags?: RiskFlag[];
  disclaimers?: string[];
  bias_notes?: string[];
  data_provenance?: DataProvenance;
  llm_explanation?: LlmExplanation;
};

type AthletePreset = {
  name: string;
  goal: Goal;
  level: Level;
  age: number;
  gender: "Male" | "Female";
  weightKg: number;
  heightM: number;
  fatPercentage: number;
  restingBpm: number;
  avgBpm: number;
  maxBpm: number;
  hrvMs: number;
  sessionDurationHours: number;
  workoutFrequencyDaysWeek: number;
  waterIntakeLiters: number;
  timeInGymMin: number;
  idleTimeMin: number;
  completionPct: number;
  sleepHours: number;
  recoveryReady: number;
  workoutCompleted: number;
  proteinTargetG: number;
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

const PRESETS: AthletePreset[] = [
  { name: "Recovery Test", goal: "fat_loss", level: "beginner", age: 24, gender: "Female", weightKg: 68, heightM: 1.68, fatPercentage: 24.2, restingBpm: 68, avgBpm: 154, maxBpm: 182, hrvMs: 41, sessionDurationHours: 1.4, workoutFrequencyDaysWeek: 3, waterIntakeLiters: 1.8, timeInGymMin: 84, idleTimeMin: 28, completionPct: 88, sleepHours: 5.2, recoveryReady: 0, workoutCompleted: 1, proteinTargetG: 32 },
  { name: "Strength Build", goal: "muscle_gain", level: "intermediate", age: 28, gender: "Male", weightKg: 82, heightM: 1.8, fatPercentage: 18.5, restingBpm: 61, avgBpm: 146, maxBpm: 184, hrvMs: 56, sessionDurationHours: 1.2, workoutFrequencyDaysWeek: 4, waterIntakeLiters: 2.9, timeInGymMin: 79, idleTimeMin: 11, completionPct: 95, sleepHours: 7.4, recoveryReady: 1, workoutCompleted: 1, proteinTargetG: 38 },
  { name: "Endurance Peak", goal: "endurance", level: "advanced", age: 31, gender: "Male", weightKg: 74, heightM: 1.77, fatPercentage: 13.9, restingBpm: 54, avgBpm: 162, maxBpm: 190, hrvMs: 63, sessionDurationHours: 1.6, workoutFrequencyDaysWeek: 6, waterIntakeLiters: 3.4, timeInGymMin: 96, idleTimeMin: 6, completionPct: 97, sleepHours: 7.9, recoveryReady: 1, workoutCompleted: 1, proteinTargetG: 34 },
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function confidenceClass(confidence?: Confidence) {
  if (confidence === "High") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30";
  if (confidence === "Medium") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30";
  return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30";
}

function confidenceFill(confidence?: Confidence) {
  if (confidence === "High") return 88;
  if (confidence === "Medium") return 62;
  return 34;
}

function safeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(value: string | undefined, fallback = "") {
  return value && value.trim() ? value : fallback;
}

function normalizeResult(result: FitTrackApiResult | null, goal: Goal, level: Level, age: number) {
  if (!result) return null;
  const fatigueScore = safeNumber(result.fatigue_score, 0);
  const calories = safeNumber(result.calories_burned, 0);
  const confidence = result.confidence ?? "Medium";
  return {
    ...result,
    workout: Array.isArray(result.workout) ? result.workout : [],
    fatigue_score: fatigueScore,
    fatigue: Number.isFinite(safeNumber(result.fatigue)) ? safeNumber(result.fatigue) : fatigueScore,
    calories_burned: calories,
    confidence,
    fatigue_label: result.fatigue_label ?? (fatigueScore < 25 ? "Low" : fatigueScore < 50 ? "Moderate" : fatigueScore < 70 ? "High" : "Very High"),
    recovery_ready: typeof result.recovery_ready === "boolean" ? result.recovery_ready : fatigueScore < 60,
    protein_target_g: safeNumber(result.protein_target_g, 30),
    experience_label: result.experience_label ?? LEVEL_LABELS[level],
    workout_type: result.workout_type ?? (goal === "muscle_gain" ? "Strength" : goal === "fat_loss" ? "HIIT" : "Cardio"),
    goal: result.goal ?? goal,
    summary: safeText(result.summary),
    nutrition_tip: safeText(result.nutrition_tip, result.nutrition ?? ""),
    recovery_tip: safeText(result.recovery_tip),
    title: safeText(result.title, "AI Generated Plan"),
    explanation: safeText(result.explanation),
    nutrition: safeText(result.nutrition, result.nutrition_tip ?? ""),
    inputs: result.inputs ?? { goal, level, age },
    generatedAt: result.generatedAt ?? new Date().toISOString(),
    governance_status: result.governance_status ?? "pass",
    governance_summary: safeText(result.governance_summary, "Recommendation released."),
    risk_flags: Array.isArray(result.risk_flags) ? result.risk_flags : [],
    disclaimers: Array.isArray(result.disclaimers) ? result.disclaimers : [],
    bias_notes: Array.isArray(result.bias_notes) ? result.bias_notes : [],
    data_provenance: (result.data_provenance ?? {}) as DataProvenance,
    llm_explanation: result.llm_explanation,
  };
}

function ProgressRing({ value }: { value: number }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const off = circ - (value / 100) * circ;
  return (
    <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-950/70 ring-1 ring-white/10">
      <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-white/10" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-cyan-400" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold text-white">{Math.round(value)}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Fatigue</div>
      </div>
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence?: Confidence }) {
  const pct = confidenceFill(confidence);
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400">
        <span>Confidence</span><span>{confidence ?? "Medium"}</span>
      </div>
      <div className="mt-3 h-3 rounded-full bg-white/10">
        <div className={cn("h-3 rounded-full bg-gradient-to-r transition-all duration-500", confidence === "High" ? "from-emerald-400 to-cyan-400" : confidence === "Medium" ? "from-amber-400 to-orange-400" : "from-rose-400 to-pink-400")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">Higher confidence means the model is seeing a cleaner signal from your inputs.</p>
    </div>
  );
}

function ModelBadge() {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
      <Brain className="h-4 w-4 text-cyan-300" />
      Powered by a Random Forest model trained on workout and biometric data
    </div>
  );
}

export default function FitTrackAI() {
  const [goal, setGoal] = useState<Goal>("muscle_gain");
  const [level, setLevel] = useState<Level>("intermediate");
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [weightKg, setWeightKg] = useState(78);
  const [heightM, setHeightM] = useState(1.78);
  const [fatPercentage, setFatPercentage] = useState(18.5);
  const [restingBpm, setRestingBpm] = useState(62);
  const [avgBpm, setAvgBpm] = useState(145);
  const [maxBpm, setMaxBpm] = useState(182);
  const [hrvMs, setHrvMs] = useState(55);
  const [sessionDurationHours, setSessionDurationHours] = useState(1.0);
  const [workoutFrequencyDaysWeek, setWorkoutFrequencyDaysWeek] = useState(4);
  const [waterIntakeLiters, setWaterIntakeLiters] = useState(2.5);
  const [timeInGymMin, setTimeInGymMin] = useState(75);
  const [idleTimeMin, setIdleTimeMin] = useState(10);
  const [completionPct, setCompletionPct] = useState(90);
  const [sleepHours, setSleepHours] = useState(7);
  const [recoveryReady, setRecoveryReady] = useState(1);
  const [workoutCompleted, setWorkoutCompleted] = useState(1);
  const [proteinTargetG, setProteinTargetG] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FitTrackApiResult | null>(null);

  const glow = useMemo(() => GOAL_STYLES[goal], [goal]);
  const safeResult = useMemo(() => normalizeResult(result, goal, level, age), [result, goal, level, age]);

  const coachInsight = useMemo(() => {
    if (!safeResult) return "Your personalized coaching insight will appear after you generate a plan.";
    const fatigue = safeResult.fatigue_score ?? 0;
    const goalText = GOAL_LABELS[goal].toLowerCase();
    if (fatigue >= 75) return `This athlete is carrying a heavy ${goalText} load today. Low sleep (${sleepHours.toFixed(1)} hrs) and higher idle time (${idleTimeMin} min) suggest recovery should come first.`;
    if (fatigue >= 55) return `This athlete shows moderate fatigue due to session load and recovery inputs. A balanced ${goalText} session is recommended.`;
    return `This athlete looks fresh and ready. Recovery inputs are strong, so the model is comfortable recommending a more aggressive ${goalText} day.`;
  }, [safeResult, goal, sleepHours, idleTimeMin]);

  function applyPreset(p: AthletePreset) {
    setGoal(p.goal);
    setLevel(p.level);
    setAge(p.age);
    setGender(p.gender);
    setWeightKg(p.weightKg);
    setHeightM(p.heightM);
    setFatPercentage(p.fatPercentage);
    setRestingBpm(p.restingBpm);
    setAvgBpm(p.avgBpm);
    setMaxBpm(p.maxBpm);
    setHrvMs(p.hrvMs);
    setSessionDurationHours(p.sessionDurationHours);
    setWorkoutFrequencyDaysWeek(p.workoutFrequencyDaysWeek);
    setWaterIntakeLiters(p.waterIntakeLiters);
    setTimeInGymMin(p.timeInGymMin);
    setIdleTimeMin(p.idleTimeMin);
    setCompletionPct(p.completionPct);
    setSleepHours(p.sleepHours);
    setRecoveryReady(p.recoveryReady);
    setWorkoutCompleted(p.workoutCompleted);
    setProteinTargetG(p.proteinTargetG);
  }

  function resetForm() {
    applyPreset(PRESETS[1]);
    setResult(null);
    setError("");
  }

  async function handleGenerate() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/fittrack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!res.ok || !json.ok) throw new Error(json?.error || "Failed to generate plan");
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
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Fitness Demo
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">FitTrack AI</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Personalized workouts, fatigue-aware coaching, and recovery guidance in one clean dashboard.</p>
            <ModelBadge />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[320px]">
            <StatPill icon={Dumbbell} label="Workout" value={GOAL_LABELS[goal]} />
            <StatPill icon={HeartPulse} label="Level" value={LEVEL_LABELS[level]} />
            <StatPill icon={Trophy} label="Age" value={String(age)} />
          </div>
        </header>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {PRESETS.map((preset) => (
            <button key={preset.name} onClick={() => applyPreset(preset)} className="group rounded-3xl border border-white/10 bg-white/5 p-4 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-white/8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sample Athlete</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{preset.name}</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-300"><ChevronRight className="h-5 w-5" /></div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{GOAL_LABELS[preset.goal]} • {LEVEL_LABELS[preset.level]} • {preset.sleepHours.toFixed(1)} hrs sleep</p>
            </button>
          ))}
        </div>

        <main className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Build your training plan</h2>
                <p className="mt-1 text-sm text-slate-400">Enter details and the assistant will generate a workout plan, fatigue score, and recovery recommendation.</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <Brain className="h-4 w-4 text-cyan-300" /> Backend connected
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => applyPreset(PRESETS[0])} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10"><Wind className="h-4 w-4 text-rose-300" />Recovery Test</button>
              <button onClick={() => applyPreset(PRESETS[1])} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-500/10"><Dumbbell className="h-4 w-4 text-cyan-300" />Strength Build</button>
              <button onClick={() => applyPreset(PRESETS[2])} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-orange-400/30 hover:bg-orange-500/10"><Activity className="h-4 w-4 text-orange-300" />Endurance Peak</button>
              <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-300/30 hover:bg-slate-500/10"><RotateCcw className="h-4 w-4 text-slate-300" />Reset</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <FieldCard title="Fitness Goal" icon={Target}><select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"><option value="muscle_gain">Muscle Gain</option><option value="fat_loss">Fat Loss</option><option value="endurance">Endurance</option></select></FieldCard>
              <FieldCard title="Experience Level" icon={GraduationCap}><select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></FieldCard>
              <FieldCard title="Age" icon={Activity}><input type="range" min={18} max={65} value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 flex items-center justify-between text-sm text-slate-300"><span>18</span><span className="font-medium text-white">{age}</span><span>65</span></div></FieldCard>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard title="Gender" icon={GraduationCap}><select value={gender} onChange={(e) => setGender(e.target.value as "Male" | "Female")} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"><option value="Male">Male</option><option value="Female">Female</option></select></FieldCard>
              <FieldCard title="Weight (kg)" icon={Activity}><input type="range" min={40} max={130} step={1} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{weightKg} kg</div></FieldCard>
              <FieldCard title="Height (m)" icon={Activity}><input type="range" min={1.5} max={2.0} step={0.01} value={heightM} onChange={(e) => setHeightM(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{heightM.toFixed(2)} m</div></FieldCard>
              <FieldCard title="Body Fat %" icon={Target}><input type="range" min={8} max={40} step={0.1} value={fatPercentage} onChange={(e) => setFatPercentage(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{fatPercentage.toFixed(1)}%</div></FieldCard>
              <FieldCard title="Resting BPM" icon={HeartPulse}><input type="range" min={45} max={90} step={1} value={restingBpm} onChange={(e) => setRestingBpm(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{restingBpm}</div></FieldCard>
              <FieldCard title="Avg BPM" icon={HeartPulse}><input type="range" min={106} max={185} step={1} value={avgBpm} onChange={(e) => setAvgBpm(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{avgBpm}</div></FieldCard>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard title="Max BPM" icon={HeartPulse}><input type="range" min={116} max={202} step={1} value={maxBpm} onChange={(e) => setMaxBpm(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{maxBpm}</div></FieldCard>
              <FieldCard title="HRV (ms)" icon={HeartPulse}><input type="range" min={20} max={100} step={1} value={hrvMs} onChange={(e) => setHrvMs(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{hrvMs} ms</div></FieldCard>
              <FieldCard title="Session Duration" icon={Activity}><input type="range" min={0.3} max={2.0} step={0.1} value={sessionDurationHours} onChange={(e) => setSessionDurationHours(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{sessionDurationHours.toFixed(1)} hrs</div></FieldCard>
              <FieldCard title="Workout Frequency" icon={Target}><input type="range" min={2} max={6} step={1} value={workoutFrequencyDaysWeek} onChange={(e) => setWorkoutFrequencyDaysWeek(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{workoutFrequencyDaysWeek} days/week</div></FieldCard>
              <FieldCard title="Water Intake" icon={Salad}><input type="range" min={0.5} max={5} step={0.1} value={waterIntakeLiters} onChange={(e) => setWaterIntakeLiters(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{waterIntakeLiters.toFixed(1)} L</div></FieldCard>
              <FieldCard title="Time in Gym" icon={Activity}><input type="range" min={21} max={141} step={1} value={timeInGymMin} onChange={(e) => setTimeInGymMin(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{timeInGymMin} min</div></FieldCard>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard title="Idle Time" icon={Activity}><input type="range" min={0} max={60} step={1} value={idleTimeMin} onChange={(e) => setIdleTimeMin(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{idleTimeMin} min</div></FieldCard>
              <FieldCard title="Completion %" icon={BadgeCheck}><input type="range" min={50} max={100} step={1} value={completionPct} onChange={(e) => setCompletionPct(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{completionPct}%</div></FieldCard>
              <FieldCard title="Sleep Hours" icon={HeartPulse}><input type="range" min={4} max={10} step={0.1} value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{sleepHours.toFixed(1)} hrs</div></FieldCard>
              <FieldCard title="Recovery Ready" icon={Target}><select value={recoveryReady} onChange={(e) => setRecoveryReady(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"><option value={1}>Yes</option><option value={0}>No</option></select></FieldCard>
              <FieldCard title="Workout Completed" icon={Target}><select value={workoutCompleted} onChange={(e) => setWorkoutCompleted(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none"><option value={1}>Yes</option><option value={0}>No</option></select></FieldCard>
              <FieldCard title="Protein Target (g)" icon={Salad}><input type="range" min={20} max={60} step={1} value={proteinTargetG} onChange={(e) => setProteinTargetG(Number(e.target.value))} className="w-full accent-cyan-400" /><div className="mt-2 text-sm text-slate-300">{proteinTargetG} g</div></FieldCard>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleGenerate} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400 px-5 py-3 font-medium text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{loading ? "Generating plan..." : "Generate Plan"}</button>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"><BadgeCheck className="h-4 w-4 text-emerald-300" />Personalized outputs from backend</div>
            </div>

            {error ? <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

            <AnimatePresence mode="wait">
              {safeResult ? (
                <motion.div key={`${safeResult.goal}-${safeResult.inputs?.level ?? level}-${safeResult.inputs?.age ?? age}-${safeResult.generatedAt}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }} className="mt-6 grid gap-4">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-xl shadow-black/20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Session Output</p>
                        <h3 className="mt-2 text-2xl font-semibold">{safeResult.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">Confidence: <span className={cn("ml-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", confidenceClass(safeResult.confidence))}>{safeResult.confidence}</span></p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"><div className="flex items-center gap-2 text-cyan-300"><Flame className="h-4 w-4" />Fatigue score</div><div className="mt-2 text-3xl font-semibold">{Math.round(safeResult.fatigue_score)}/100</div></div>
                    </div>
                    <ConfidenceBar confidence={safeResult.confidence} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <GlassCard title="Workout Plan" icon={Dumbbell}><ul className="mt-4 space-y-3">{(safeResult.workout ?? []).map((exercise, idx) => (<li key={exercise} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-200">{idx + 1}</div><span className="text-sm text-slate-100">{exercise}</span></li>))}</ul></GlassCard>
                    <GlassCard title="Fatigue Score" icon={Flame}><div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between"><ProgressRing value={safeResult.fatigue_score} /><div className="flex-1 space-y-3 text-sm text-slate-300 sm:pl-4"><p>This score estimates how demanding the workout should feel based on your goal, experience level, and recovery inputs.</p><div className="h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400" style={{ width: `${safeResult.fatigue_score}%` }} /></div><p className="text-xs uppercase tracking-[0.25em] text-slate-500">Higher score = more recovery needed</p><div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">Recovery status: <span className="font-semibold">{safeResult.recovery_ready ? "Ready" : "Needs recovery"}</span></div></div></div></GlassCard>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <GlassCard title="AI Explanation" icon={Brain}><p className="mt-4 text-sm leading-6 text-slate-300">{safeResult.explanation}</p><div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200"><Sparkles className="h-3.5 w-3.5" />Adaptive plan logic</div><div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Summary: {safeResult.summary}</div><div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Coach insight: {coachInsight}</div></GlassCard>
                    <GlassCard title="Nutrition Recommendation" icon={Salad}><p className="mt-4 text-sm leading-6 text-slate-300">{safeResult.nutrition_tip}</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Protein target: <span className="font-semibold text-white">{safeResult.protein_target_g}g</span></div><div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Recovery tip: {safeResult.recovery_tip}</div></GlassCard>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label="Calories Burned" value={`${Math.round(safeResult.calories_burned)}`} />
                    <MiniMetric label="Fatigue Label" value={safeResult.fatigue_label} />
                    <MiniMetric label="Workout Type" value={safeResult.workout_type} />
                    <MiniMetric label="Experience" value={safeResult.experience_label} />
                  </div>

                  {safeResult.llm_explanation ? (
                    <AICoachNotesCard llm={safeResult.llm_explanation} />
                  ) : null}

                  <GovernanceCard
                    status={safeResult.governance_status}
                    summary={safeResult.governance_summary}
                    flags={safeResult.risk_flags}
                    provenance={safeResult.data_provenance}
                    biasNotes={safeResult.bias_notes}
                  />

                  {safeResult.disclaimers && safeResult.disclaimers.length > 0 ? (
                    <DisclaimerStrip items={safeResult.disclaimers} />
                  ) : null}
                </motion.div>
              ) : (
                <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-300">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5"><Sparkles className="h-8 w-8 text-cyan-300" /></div>
                  <h3 className="mt-4 text-lg font-semibold text-white">Your plan will appear here</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Choose a goal, skill level, and recovery details, then generate a personalized workout plan with fatigue scoring, AI explanations, and nutrition guidance.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <aside className="space-y-6">
            <BusinessValuePanel result={safeResult} />
            <GovernancePosturePanel result={safeResult} />
            <GlassPanel title="Demo Highlights" icon={HeartPulse}>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />Personalised workout, calories and fatigue from a single ML call.</li>
                <li className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />LLM coaching narrative grounded in the deterministic prediction.</li>
                <li className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />Rule-based governance produces auditable risk flags before the LLM speaks.</li>
                <li className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />Bias and data provenance shipped alongside every prediction.</li>
              </ul>
            </GlassPanel>
          </aside>
        </main>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left shadow-lg shadow-black/20 backdrop-blur">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Icon className="h-4 w-4" /></div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function FieldCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200"><Icon className="h-4 w-4 text-cyan-300" />{title}</div>{children}</div>;
}

function GlassCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-cyan-300" />{title}</div>{children}</div>;
}

function GlassPanel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-orange-300" />{title}</div>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div><div className="max-w-[55%] text-right text-sm text-slate-200">{value}</div></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"><div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</div><div className="mt-2 text-lg font-semibold text-white">{value}</div></div>;
}

function severityStyle(severity: RiskSeverity) {
  switch (severity) {
    case "block":
      return "border-rose-400/40 bg-rose-500/15 text-rose-100";
    case "warning":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    case "caution":
      return "border-yellow-400/20 bg-yellow-500/10 text-yellow-100";
    default:
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  }
}

function severityIcon(severity: RiskSeverity) {
  if (severity === "block" || severity === "warning") return AlertTriangle;
  if (severity === "caution") return CircleAlert;
  return Info;
}

function statusStyle(status: GovernanceStatus | undefined) {
  if (status === "block") return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30";
  if (status === "review") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30";
  return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30";
}

function statusLabel(status: GovernanceStatus | undefined) {
  if (status === "block") return "Held for review";
  if (status === "review") return "Released - review flags";
  return "Cleared";
}

function AICoachNotesCard({ llm }: { llm: LlmExplanation }) {
  const isLLM = !llm.provider.startsWith("deterministic");
  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-950/85 via-cyan-950/20 to-slate-950/85 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-cyan-300" /> AI Coach Notes
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
            isLLM ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30"
                  : "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20",
          )}>
            <Brain className="h-3.5 w-3.5" />
            {isLLM ? llm.provider : "Template fallback"}
          </span>
          {llm.elapsed_ms ? (
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-400 ring-1 ring-white/10">
              {llm.elapsed_ms} ms
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-base font-semibold text-white">{llm.headline}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{llm.explanation}</p>
      {llm.risk_acknowledgement ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{llm.risk_acknowledgement}</span>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-slate-500">{llm.confidence_caveat}</p>
    </div>
  );
}

function GovernanceCard({
  status,
  summary,
  flags,
  provenance,
  biasNotes,
}: {
  status: GovernanceStatus | undefined;
  summary: string | undefined;
  flags: RiskFlag[] | undefined;
  provenance: DataProvenance | undefined;
  biasNotes: string[] | undefined;
}) {
  const flagList = flags ?? [];
  const grouped: Record<string, RiskFlag[]> = {};
  for (const f of flagList) {
    grouped[f.category] = grouped[f.category] ? [...grouped[f.category], f] : [f];
  }
  const metrics = provenance?.test_metrics ?? {};

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-300" /> Trust &amp; Governance
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold", statusStyle(status))}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {statusLabel(status)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">{summary}</p>

      {flagList.length > 0 ? (
        <div className="mt-4 space-y-2">
          {flagList.map((flag) => {
            const Icon = severityIcon(flag.severity);
            return (
              <div key={flag.code} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", severityStyle(flag.severity))}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-300/70">
                    <span>{flag.severity}</span>
                    <span>•</span>
                    <span>{flag.category}</span>
                  </div>
                  <p className="mt-1 font-semibold text-white">{flag.title}</p>
                  <p className="text-slate-200/90">{flag.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
          <BadgeCheck className="h-3.5 w-3.5" /> No active risk flags for this profile.
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            <Database className="h-3.5 w-3.5 text-cyan-300" /> Data provenance
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-slate-300">
            <div><span className="text-slate-500">Model:</span> {provenance?.model ?? "RandomForestRegressor"}</div>
            <div><span className="text-slate-500">Training rows:</span> {provenance?.training_sample_size ?? 2000} ({provenance?.training_split ?? "80 / 20"})</div>
            <div><span className="text-slate-500">Features:</span> {provenance?.feature_count ?? 31}</div>
            <div><span className="text-slate-500">Held-out test:</span> MAE {metrics.MAE_kcal ?? 44.3} kcal · R² {metrics.R2 ?? 0.936}</div>
            <div><span className="text-slate-500">Rules engine:</span> {provenance?.rules_engine_version ?? "fittrack.governance"}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            <Scale className="h-3.5 w-3.5 text-orange-300" /> Bias awareness
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
            {(biasNotes ?? []).slice(0, 4).map((note, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-300/60" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DisclaimerStrip({ items }: { items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-400 backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">
        <ScrollText className="h-3.5 w-3.5" /> Disclaimers
      </div>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BusinessValuePanel({ result }: { result: ReturnType<typeof normalizeResult> }) {
  return (
    <GlassPanel title="Business Value" icon={TrendingUp}>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        FitTrack AI replaces $40-80/hour personal coaching with sub-second, fatigue-aware
        guidance that fits inside any gym, wellness app, or corporate benefits programme.
      </p>
      <div className="mt-4 grid gap-3">
        <ValueRow label="Cost per prediction" value="≈ $0" accent="emerald" />
        <ValueRow label="Latency" value="< 1 s end-to-end" accent="cyan" />
        <ValueRow label="Model accuracy" value="R² 0.94 / MAE 44 kcal" accent="orange" />
        <ValueRow label="Scale" value="1 model · ∞ users" accent="violet" />
      </div>
      {result ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-400">
          Today&apos;s session is forecast at <span className="text-white">{Math.round(result.calories_burned)} kcal</span>{" "}
          with a fatigue score of <span className="text-white">{Math.round(result.fatigue_score)}</span>{" "}
          and a protein target of <span className="text-white">{result.protein_target_g} g</span>.
        </div>
      ) : null}
    </GlassPanel>
  );
}

function GovernancePosturePanel({ result }: { result: ReturnType<typeof normalizeResult> }) {
  const status = result?.governance_status ?? "pass";
  const flags = result?.risk_flags ?? [];
  return (
    <GlassPanel title="Governance Posture" icon={ShieldCheck}>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold", statusStyle(status))}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {statusLabel(status)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
          {flags.length} active flag{flags.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-300">
        <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />Rule-based safety + distribution checks run before any LLM call.</li>
        <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />LLM narrative is grounded in the deterministic prediction; cannot invent numbers.</li>
        <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />Bias and data provenance ship with every response.</li>
        <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />Disclaimers attach to every recommendation; no medical claims.</li>
      </ul>
    </GlassPanel>
  );
}

function ValueRow({ label, value, accent }: { label: string; value: string; accent: "cyan" | "emerald" | "orange" | "violet" }) {
  const accentClass =
    accent === "emerald" ? "text-emerald-300 bg-emerald-500/10 ring-emerald-400/20" :
    accent === "orange" ? "text-orange-300 bg-orange-500/10 ring-orange-400/20" :
    accent === "violet" ? "text-violet-300 bg-violet-500/10 ring-violet-400/20" :
    "text-cyan-300 bg-cyan-500/10 ring-cyan-400/20";
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", accentClass)}>{value}</div>
    </div>
  );
}
