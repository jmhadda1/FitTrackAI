# FitTrack AI — Model Card

**Version**: `fittrack.calories/2026.04`
**Owner**: FitTrack AI team (`jmhadda1/FitTrackAI`)
**Last reviewed**: 2026-04-29

## 1. Model details

| Field | Value |
|---|---|
| Algorithm | `RandomForestRegressor` (scikit-learn 1.6.1) |
| Baseline considered | `DecisionTreeRegressor` |
| Target variable | `calories_burned` (kcal per session) |
| Persistence | `calories_model.joblib` (~28 MB, joblib compressed pickle) |
| Inference latency | < 50 ms / request on commodity hardware |
| Feature count after encoding | 31 |
| Feature schema | `calories_model_metadata.json` (committed alongside the model) |

## 2. Intended use

- **Primary**: estimate calorie burn for a single workout session given an athlete's profile, physiology, session context, and recent behaviour.
- **Downstream**: the calorie estimate feeds a deterministic post-processing layer that produces fatigue score, protein target, workout plan, and recovery / nutrition tips. The model itself does **not** select exercises, prescribe loads, or make medical decisions.
- **Out of scope**: medical or clinical guidance, weight or load prescription, pregnancy or rehab planning, doping / supplement decisions.

## 3. Training data

- 2,000 workout-session records, one row per athlete-session.
- Features grouped into four families: athlete profile, physiology, session context, behaviour. The exact column list is in `calories_model_metadata.json`.
- 80 / 20 train-test split (1,600 / 400). Random stratification was not used — small dataset.
- **Dropped at training time** to avoid leakage:
  - `session_date` (calendar leakage)
  - `muscles_trained` (free text, out of scope)
  - `cumulative_load_7d_kcal` (target leakage — derived from past `calories_burned`)

## 4. Performance

Held-out test set (n = 400):

| Metric | Value | Interpretation |
|---|---|---|
| MAE | 44.3 kcal | average absolute error per session |
| RMSE | 62.9 kcal | penalises larger errors more |
| R² | 0.936 | explains ≈ 94 % of variance in `calories_burned` |

Errors are within ~5–15 % of typical session burns (300–900 kcal). The product surfaces predictions as **estimates**, never measurements.

## 5. Known limitations

1. **Sample size.** 2,000 sessions is enough for the metrics above but limits drift detection and personalisation. Long-tail athlete profiles (very low body fat, very high HRV, athletes over 60) are sparsely represented.
2. **Static dataset.** The model was trained once and is not currently retrained on user feedback; no online learning loop.
3. **Calories as a proxy.** Calorie burn is the modelled quantity, but it is not the user's real goal (which is progress over time). Calorie predictions can be locally accurate without driving better long-term outcomes.
4. **Categorical reference categories.** `pandas.get_dummies(drop_first=True)` was used during training. The reference category for `workout_type` is `Cardio`; users selecting an unknown workout type land in the same baseline.
5. **Heart-rate signals depend on user-supplied values.** Garbage in, garbage out — the governance layer (see §7) catches inconsistent inputs (e.g. `avg_bpm > max_bpm`) but cannot guarantee data quality.

## 6. Bias awareness

Documented to the user in every response (`bias_notes` field) and rendered in the **Trust & Governance** panel:

1. **Binary gender encoding.** Training data uses `Male` / `Female`. Non-binary identities are not represented. Predictions for `gender = "Female"` use the drop-first reference column; selecting `Male` adds the `gender_Male` flag. This is the only direct gender effect in the model.
2. **Population skew.** Sample is weighted toward intermediate-level athletes. Extremes (true beginners, advanced) are under-represented at the tails.
3. **No medical context.** The model does not know about chronic conditions, medications, pregnancy, rehab status, or surgical history. Outputs must not be used as a substitute for clinical guidance.
4. **Workout-type vocabulary is finite.** `Cardio`, `CrossFit`, `HIIT`, `Strength`, `Yoga`. Niche modalities default to the `Cardio` reference category, which can mis-estimate calorie burn for activities with very different intensity profiles.

## 7. Safety, governance and risk signalling

A rule-based governance layer (`python-backend/governance.py`) runs **after** the model prediction and **before** the LLM narrative. It produces:

- A `governance_status` of `pass`, `review`, or `block`.
- Structured `risk_flags` with `severity` ∈ `{info, caution, warning, block}`. Examples:
  - `ood_age` — input outside the training age range
  - `bmi_extreme` / `bmi_obese` — distribution / safety
  - `bpm_inconsistent` — `avg_bpm > max_bpm`, data quality
  - `sleep_low`, `long_session`, `fatigue_high`, `fatigue_very_high` — safety
  - `advanced_undercooked` — advanced volume + recovery flagged false (combined-condition rule)
  - `calories_outlier` — predicted kcal outside plausible band
- `disclaimers` (always attached) — non-medical, non-prescriptive guidance text.
- `data_provenance` — model name, sample size, split, test metrics, feature count, rules-engine version.

The governance layer is **fully deterministic**. It is auditable, testable, and unaffected by LLM output.

## 8. LLM layer

A separate LLM module (`python-backend/llm.py`) generates the natural-language coaching narrative:

- Provider chosen from env: `OPENAI_API_KEY` / `GEMINI_API_KEY`. Defaults to a deterministic template if none is set, so the system works fully offline.
- The LLM is given the deterministic prediction and the governance report.
- The system prompt forbids medical advice, forbids inventing numbers, and forbids prescribing loads / sets / reps.
- LLM output cannot change `governance_status`. It can only acknowledge flags raised by the rules engine.

## 9. Updating this card

Bump the version line at the top, document the change, and re-run the Render deploy. New fields added to the response should be reflected in the schema-mapping documentation (`FitTrackAI_ReviewerResponse.docx`).
