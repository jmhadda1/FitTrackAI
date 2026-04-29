# FitTrack AI — Business Value & Expected Impact

**Audience**: stakeholders, investors, gym / wellness-program decision-makers, course reviewers.
**Last updated**: 2026-04-29

## 1. The opportunity

The fitness industry sells motivation and access; the part that actually drives outcomes — personalised, fatigue-aware coaching — is locked behind the cost of a human trainer. FitTrack AI delivers that coaching layer at software margins.

## 2. Stakeholders and value to each

| Stakeholder | What they get | Why they pay (directly or indirectly) |
|---|---|---|
| **End user** | Sub-second personalised plan + calorie estimate + fatigue + recovery tip + nutrition target. | Free-tier user; pays in engagement / data. Premium users unlock multi-week progressions, wearable sync, and a real LLM-generated coach. |
| **Gym / studio operators** | White-label coaching tool inside their member app or kiosk. Reduces churn and post-session injury. Every workout becomes structured retention data. | Per-active-member pricing. Coaching parity with boutique studios at chain pricing. |
| **Corporate wellness teams** | Drop-in benefit with anonymised activity / engagement reporting. No internal ML team required. | Per-active-employee pricing matched to budget cycles. |
| **Insurance / health plans** | Behavioural data + risk flags from a governance layer that is auditable. | Long-term: discount programmes, behavioural underwriting partnerships. |

## 3. Headline numbers

| KPI | Current state | Source |
|---|---|---|
| Cost per prediction | ≈ $0 (after deploy; LLM call only when configured) | Render free tier + scikit-learn inference |
| End-to-end latency | < 1 s through proxy + model + LLM fallback | Live tested in `FitTrackAI_ReviewerResponse_v2.docx` |
| Model accuracy on calories | MAE 44.3 kcal · RMSE 62.9 kcal · R² 0.936 | `calories_model_metadata.json` |
| Personal-trainer baseline | $40–$80 / hour | Industry surveys |
| Dropout in first 5 months | ~80 % of new gym members | Multiple industry trade-press estimates |

## 4. Expected impact

These are the levers we explicitly target:

1. **Reduce dropout.** Generic plans drive boredom; over-training drives injury. A fatigue-aware system addresses both. Even a 5 percentage-point reduction in 5-month churn is enormous for an operator.
2. **Increase session quality.** Recovery-aware plans push hard when the body is ready and back off when it isn't. That converts the same number of training hours into more progress.
3. **Capture data nobody else has.** Every generated session is structured training data: profile, plan, fatigue, completion, downstream behaviour. Used responsibly, this becomes the foundation for v2 of the model and for clinical / retention research collaborations.
4. **Lower the cost of coaching by orders of magnitude.** A trainer can deliver maybe 30 hours of personal attention per week. The same model serves an unbounded number of users at near-zero marginal cost.

## 5. Trust & governance as a feature

In a category where bad advice can cause injury, governance is not just compliance — it is part of the product. FitTrack AI ships a model card (`python-backend/MODEL_CARD.md`), a deterministic risk-flag layer (`python-backend/governance.py`), and a UI panel (`Trust & Governance` in the dashboard) that surfaces:

- A pass / review / block status for every recommendation.
- Structured, severity-graded risk flags (e.g. `bmi_obese`, `fatigue_very_high`, `advanced_undercooked`).
- Data provenance: model name, training sample size, split, test metrics, feature count, rules-engine version.
- Bias awareness notes.
- Standard disclaimers (no medical advice, consult a clinician, stop on pain or chest discomfort).

The LLM layer is grounded in this deterministic output — it can acknowledge flags but cannot override them. This protects the user from hallucinated coaching and protects the operator from off-policy advice.

## 6. Ethical concerns and mitigations

| Concern | Mitigation in the product today |
|---|---|
| **Bias from a small dataset (n = 2,000) that under-represents extremes.** | Out-of-distribution flags (`ood_age`, `bmi_extreme`); explicit `bias_notes` returned in every response. |
| **Binary gender encoding.** | Documented in the model card and in the `bias_notes` array shown in the UI. Users select gender; default behaviour treats `Female` as the drop-first reference category. |
| **Risk of medical claims.** | LLM system prompt forbids medical advice. Disclaimers attached to every response. UI shows them as a footer chip after each plan. |
| **Hallucination by the LLM.** | LLM output is constrained to JSON, must cite numbers from the deterministic prediction, and cannot prescribe loads / sets / reps. Provider, latency and model name are surfaced in the UI for transparency. |
| **Over-training and under-recovery.** | Fatigue score + multi-condition rule (`advanced_undercooked`) escalate severity. Predictions can be elevated to `block` status when high fatigue meets advanced volume + flagged recovery. |
| **Data quality from wearables.** | Rule-based checks for inconsistent BPM / HRV / completion values, returned to the user as `data_quality` flags. |

## 7. Roadmap

| Horizon | Initiative | Why it matters |
|---|---|---|
| 30 days | Wearable connectors (Apple Health, Fitbit, Garmin). | Removes manual data entry, increases prediction confidence. |
| 60 days | Longitudinal retraining pipeline + automated drift report. | Keeps the model honest as user demographics change. |
| 90 days | Pilot deployment in a partner gym; measure 60-day retention vs. baseline. | Converts theoretical impact into an evidence-backed sales pitch. |
| 6 months | Premium LLM coach tier with structured progressions and adaptive plans. | Up-sell path for end users; revenue per active user. |

## 8. How to verify

- **Model performance**: open `python-backend/calories_model_metadata.json` for raw metrics; `python-backend/MODEL_CARD.md` for context.
- **Governance behaviour**: send a high-risk profile to `/api/v1/predict` (e.g. `level=advanced, sleep_hours=4.5, recovery_ready=0, session_duration_hours=2.3`) and inspect `governance_status`, `risk_flags`, and `llm_explanation.risk_acknowledgement`.
- **End-to-end latency**: see `FitTrackAI_ReviewerResponse_v2.docx`, tests #1–#7 with timestamped curl evidence.
- **UI surfacing**: load the dashboard, generate a plan, and review the Trust & Governance and AI Coach Notes cards under the Session Output.
