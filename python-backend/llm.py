"""LLM layer for narrative explanations and second-pass governance review.

Design notes:

  - The LLM never overrides the rule-based governance status produced by
    governance.py. It only writes prose grounded in the deterministic outputs.
  - Provider auto-selection is controlled by environment variables:
        FITTRACK_LLM_PROVIDER : "openai" | "gemini" | "auto" | "off"
        OPENAI_API_KEY        : required for openai
        OPENAI_MODEL          : default "gpt-4o-mini"
        GEMINI_API_KEY        : required for gemini
        GEMINI_MODEL          : default "gemini-1.5-flash"
  - When no provider is configured, the layer returns a deterministic,
    template-based explanation derived from the prediction + governance report.
    This keeps the demo working without an internet connection or API spend.
  - Output schema is the same regardless of provider, so the proxy and the
    React component never branch on which LLM produced the text.

The LLM gets a short, opinionated system prompt that forbids medical claims,
forbids inventing numbers, and requires the model to cite the deterministic
prediction values verbatim. This is the explanation half of governance: even
the prose layer has guardrails.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any


SYSTEM_PROMPT = (
    "You are FitTrack AI's coaching narrator. Given a structured fitness "
    "prediction and a governance report, write a short, plain-English "
    "explanation that helps the athlete understand the recommendation.\n"
    "\n"
    "Hard rules:\n"
    "1. NEVER provide medical advice. If a risk flag has severity 'warning' or "
    "'block', surface it explicitly and recommend caution or rest.\n"
    "2. Cite the numeric values from the prediction verbatim (calories, "
    "fatigue score, protein target). Do NOT invent numbers.\n"
    "3. Do NOT prescribe specific weights, sets, or reps - the workout list is "
    "produced elsewhere; you describe intent and trade-offs only.\n"
    "4. Keep the response under 120 words.\n"
    "5. Match the user's experience level: gentler tone for beginners, more "
    "technical for advanced.\n"
    "6. Output JSON only with these keys: explanation, headline, "
    "risk_acknowledgement (string or null), confidence_caveat (string)."
)

_DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
_DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"


def _provider_choice() -> str:
    raw = (os.environ.get("FITTRACK_LLM_PROVIDER") or "auto").strip().lower()
    if raw not in {"openai", "gemini", "auto", "off"}:
        return "auto"
    return raw


def _resolved_provider() -> str | None:
    """Pick which provider to call, or None for the deterministic fallback."""
    choice = _provider_choice()
    if choice == "off":
        return None
    if choice == "openai":
        return "openai" if os.environ.get("OPENAI_API_KEY") else None
    if choice == "gemini":
        return "gemini" if os.environ.get("GEMINI_API_KEY") else None
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("GEMINI_API_KEY"):
        return "gemini"
    return None


def _build_user_prompt(payload: Any, prediction: dict, governance: dict) -> str:
    flags = governance.get("risk_flags") or []
    return (
        "Athlete profile:\n"
        f"  goal={getattr(payload, 'goal', '?')}\n"
        f"  level={getattr(payload, 'level', '?')}\n"
        f"  age={getattr(payload, 'age', '?')}\n"
        f"  gender={getattr(payload, 'gender', '?')}\n"
        f"  weight_kg={getattr(payload, 'weight_kg', '?')}\n"
        f"  height_m={getattr(payload, 'height_m', '?')}\n"
        f"  hrv_ms={getattr(payload, 'hrv_ms', '?')}\n"
        f"  sleep_hours={getattr(payload, 'sleep_hours', '?')}\n"
        f"  recovery_ready={getattr(payload, 'recovery_ready', '?')}\n"
        "\nML prediction:\n"
        f"  calories_burned={prediction.get('calories_burned')}\n"
        f"  fatigue_score={prediction.get('fatigue_score')}\n"
        f"  fatigue_label={prediction.get('fatigue_label')}\n"
        f"  protein_target_g={prediction.get('protein_target_g')}\n"
        f"  workout_type={prediction.get('workout_type')}\n"
        f"  confidence={prediction.get('confidence')}\n"
        "\nGovernance:\n"
        f"  status={governance.get('status')}\n"
        f"  flags={json.dumps([{'code': f['code'], 'severity': f['severity'], 'title': f['title']} for f in flags])}\n"
        "\nWrite the JSON now."
    )


def _fallback_payload(payload: Any, prediction: dict, governance: dict) -> dict:
    goal = (getattr(payload, "goal", "") or "").lower()
    level = (getattr(payload, "level", "") or "").lower()
    fatigue = float(prediction.get("fatigue_score") or 0)
    calories = float(prediction.get("calories_burned") or 0)
    protein = int(prediction.get("protein_target_g") or 0)

    goal_phrase = {
        "muscle_gain": "build strength with progressive overload",
        "fat_loss": "drive a calorie deficit while protecting lean mass",
        "endurance": "extend aerobic capacity at a controlled pace",
    }.get(goal, "stay consistent and recover well")

    if fatigue >= 70:
        intensity = (
            "Today is a recover-and-execute session, not a personal-best day. "
            "Quality of movement matters more than load."
        )
    elif fatigue >= 45:
        intensity = (
            "Hold a steady, productive intensity - hard enough to drive adaptation, "
            "easy enough to nail technique."
        )
    else:
        intensity = (
            "You look fresh. Push the working sets, but stop one or two reps "
            "shy of failure to keep tomorrow's session productive."
        )

    cautions = [
        f["title"]
        for f in governance.get("risk_flags") or []
        if f.get("severity") in ("warning", "block")
    ]
    risk_ack: str | None = None
    if cautions:
        risk_ack = "Heads-up: " + "; ".join(cautions[:2]) + "."

    confidence_caveat = (
        "MAE on the held-out test is ~44 kcal, so treat the calorie figure as "
        "directional rather than exact."
    )

    headline = {
        "muscle_gain": "Strength session, fatigue-aware",
        "fat_loss": "Conditioning session, recovery-aware",
        "endurance": "Aerobic session, intensity-controlled",
    }.get(goal, "Personalised session plan")

    body = (
        f"Plan goal: {goal_phrase}. {intensity} "
        f"Estimated burn is {calories:.0f} kcal; aim for about {protein}g of "
        f"protein post-session. Tone of the plan is tuned for a {level or 'general'} "
        f"athlete."
    )
    return {
        "explanation": body,
        "headline": headline,
        "risk_acknowledgement": risk_ack,
        "confidence_caveat": confidence_caveat,
        "provider": "deterministic-template",
        "elapsed_ms": 0,
    }


def _call_openai(user_prompt: str) -> dict:
    """Synchronous JSON-mode call to OpenAI's Chat Completions API."""
    import httpx

    model = os.environ.get("OPENAI_MODEL") or _DEFAULT_OPENAI_MODEL
    api_key = os.environ["OPENAI_API_KEY"]

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    started = time.perf_counter()
    with httpx.Client(timeout=20.0) as client:
        resp = client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=body,
        )
    resp.raise_for_status()
    payload = resp.json()
    text = payload["choices"][0]["message"]["content"]
    parsed = json.loads(text)
    parsed["provider"] = f"openai:{model}"
    parsed["elapsed_ms"] = int((time.perf_counter() - started) * 1000)
    return parsed


def _call_gemini(user_prompt: str) -> dict:
    """Synchronous JSON-mode call to Google Generative Language API."""
    import httpx

    model = os.environ.get("GEMINI_MODEL") or _DEFAULT_GEMINI_MODEL
    api_key = os.environ["GEMINI_API_KEY"]

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "responseMimeType": "application/json",
        },
    }
    started = time.perf_counter()
    with httpx.Client(timeout=20.0) as client:
        resp = client.post(url, json=body)
    resp.raise_for_status()
    payload = resp.json()
    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text)
    parsed["provider"] = f"gemini:{model}"
    parsed["elapsed_ms"] = int((time.perf_counter() - started) * 1000)
    return parsed


def generate_explanation(payload: Any, prediction: dict, governance: dict) -> dict:
    """Produce a coaching narrative grounded in the prediction + governance.

    Always returns a dict with keys:
        explanation, headline, risk_acknowledgement (or None),
        confidence_caveat, provider, elapsed_ms

    Falls back silently to a deterministic template on any LLM failure so the
    user-facing demo is resilient.
    """
    provider = _resolved_provider()
    if provider is None:
        return _fallback_payload(payload, prediction, governance)

    user_prompt = _build_user_prompt(payload, prediction, governance)
    try:
        if provider == "openai":
            result = _call_openai(user_prompt)
        elif provider == "gemini":
            result = _call_gemini(user_prompt)
        else:
            return _fallback_payload(payload, prediction, governance)
    except Exception as exc:
        fallback = _fallback_payload(payload, prediction, governance)
        fallback["provider"] = f"deterministic-template (after {provider} error: {exc.__class__.__name__})"
        return fallback

    for required in ("explanation", "headline"):
        if not result.get(required):
            return _fallback_payload(payload, prediction, governance)
    result.setdefault("risk_acknowledgement", None)
    result.setdefault("confidence_caveat",
                      "Predictions are estimates; MAE on held-out test is ~44 kcal.")
    return result
