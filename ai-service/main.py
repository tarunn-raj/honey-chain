# ai-service/main.py
from __future__ import annotations

import hashlib
import io
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SERVICE_DIR = Path(__file__).resolve().parent
DISEASE_MODEL_PATH = SERVICE_DIR / "disease_model.h5"
YIELD_MODEL_PATH = SERVICE_DIR / "yield_model.joblib"
DISEASE_LABELS = ["HEALTHY", "VARROA_MITE", "AMERICAN_FOULBROOD", "CHALKBROOD"]

app = FastAPI(title="Honey Chain AI Service", version="1.0.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:3000,https://honey-chain-steel.vercel.app").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_disease_model: Any = None
_yield_model: Any = None


class ColonyHealthRequest(BaseModel):
    readings: list[dict[str, Any]] = Field(min_length=1)


class YieldRequest(BaseModel):
    hiveId: str
    last30DaysReadings: list[dict[str, Any]] = Field(default_factory=list)
    floralSource: str = "MULTIFLORA"
    month: int = Field(ge=1, le=12)
    lat: float = 0.0
    lng: float = 0.0


class AnomalyRequest(BaseModel):
    hiveId: str
    readings: list[dict[str, Any]] = Field(min_length=1)


def number(reading: dict[str, Any], key: str, default: float = 0.0) -> float:
    try:
        value = float(reading.get(key, default))
        return value if math.isfinite(value) else default
    except (TypeError, ValueError):
        return default


def timestamp(reading: dict[str, Any], index: int) -> str:
    value = reading.get("recordedAt") or reading.get("timestamp")
    if value:
        return str(value)
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_disease_model() -> Any:
    global _disease_model
    if _disease_model is not None or not DISEASE_MODEL_PATH.exists():
        return _disease_model
    try:
        from tensorflow.keras.models import load_model

        _disease_model = load_model(DISEASE_MODEL_PATH)
    except Exception:
        _disease_model = None
    return _disease_model


def fallback_disease(image_bytes: bytes) -> tuple[str, float, dict[str, float]]:
    """Deterministic colour-histogram fallback for model-free demos."""
    digest = hashlib.sha256(image_bytes).digest()
    try:
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((64, 64))
        pixels = list(image.getdata())
        red = sum(pixel[0] for pixel in pixels) / (len(pixels) * 255)
        green = sum(pixel[1] for pixel in pixels) / (len(pixels) * 255)
        blue = sum(pixel[2] for pixel in pixels) / (len(pixels) * 255)
        brightness = (red + green + blue) / 3
        if red > green * 1.25 and red > blue * 1.3:
            scores = [0.08, 0.08, 0.74, 0.10]
        elif brightness < 0.32 and green > red * 0.9:
            scores = [0.12, 0.12, 0.10, 0.66]
        elif green > red * 1.08 and brightness > 0.42:
            scores = [0.10, 0.62, 0.12, 0.16]
        else:
            scores = [0.72, 0.10, 0.09, 0.09]
    except Exception:
        offset = digest[0] % len(DISEASE_LABELS)
        scores = [0.1] * len(DISEASE_LABELS)
        scores[offset] = 0.7
    result = {label: round(score, 4) for label, score in zip(DISEASE_LABELS, scores)}
    label = max(result, key=result.get)
    return label, result[label], result


def disease_advice(label: str) -> tuple[str, str]:
    advice = {
        "HEALTHY": ("Continue routine inspections, nutrition checks, and Varroa monitoring.", "low"),
        "VARROA_MITE": ("Inspect mite load and consider an approved treatment such as oxalic acid dribble according to the product label and local guidance; monitor drone brood and repeat a mite-count check.", "high"),
        "AMERICAN_FOULBROOD": ("Quarantine the colony, do not move equipment, contact the apiary inspector, and follow local rules for burning or destroying infected comb and reporting AFB.", "critical"),
        "CHALKBROOD": ("Improve ventilation, reduce damp conditions, inspect the queen, and replace heavily mummified comb while monitoring colony recovery.", "medium"),
    }
    return advice.get(label, advice["HEALTHY"])


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "honey-chain-ai",
        "diseaseModel": DISEASE_MODEL_PATH.exists(),
        "yieldModel": YIELD_MODEL_PATH.exists(),
        "fallbacks": True,
    }


@app.post("/predict/disease")
async def predict_disease(image: UploadFile = File(...)) -> dict[str, Any]:
    image_bytes = await image.read()
    if not image_bytes:
        return {"label": "HEALTHY", "confidence": 0.0, "all_scores": {label: 0.0 for label in DISEASE_LABELS}, "recommendation": "Upload a non-empty bee-frame image for screening.", "urgency": "low"}

    model = load_disease_model()
    if model is not None:
        try:
            import numpy as np
            from PIL import Image

            frame = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
            values = np.asarray(frame, dtype="float32") / 255.0
            scores_array = model.predict(values[None, ...], verbose=0)[0]
            scores = {label: round(float(scores_array[index]), 4) for index, label in enumerate(DISEASE_LABELS)}
            label = max(scores, key=scores.get)
            confidence = scores[label]
        except Exception:
            label, confidence, scores = fallback_disease(image_bytes)
    else:
        label, confidence, scores = fallback_disease(image_bytes)
    recommendation, urgency = disease_advice(label)
    return {"label": label, "confidence": round(float(confidence), 4), "all_scores": scores, "recommendation": recommendation, "urgency": urgency}


def fft_band_energy(values: list[float], low: float = 220.0, high: float = 280.0) -> float:
    if len(values) < 4:
        return 0.0
    try:
        import numpy as np

        spectrum = np.abs(np.fft.rfft(np.asarray(values, dtype=float)))
        frequencies = np.fft.rfftfreq(len(values), d=1.0)
        band = spectrum[(frequencies >= low / 1000) & (frequencies <= high / 1000)]
        return float(band.mean()) if len(band) else 0.0
    except Exception:
        return sum(1 for value in values if low <= value <= high) / len(values)


def linear_slope(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    x_mean = (len(values) - 1) / 2
    y_mean = sum(values) / len(values)
    denominator = sum((index - x_mean) ** 2 for index in range(len(values))) or 1.0
    return sum((index - x_mean) * (value - y_mean) for index, value in enumerate(values)) / denominator


@app.post("/predict/colony-health")
def predict_colony_health(request: ColonyHealthRequest) -> dict[str, Any]:
    readings = request.readings
    sound = [number(item, "soundHz") for item in readings]
    db_values = [number(item, "soundDb") for item in readings]
    weights = [number(item, "weightKg") for item in readings]
    humidity = [number(item, "humidity") for item in readings]
    temperatures = [number(item, "tempC") for item in readings]
    band_energy = fft_band_energy(sound)
    average_db = sum(db_values) / len(db_values)
    agitation = min(100.0, max(0.0, (average_db - 40) * 2.2 + (max(db_values) - min(db_values)) * 0.8))
    queen_right = min(0.99, max(0.05, 0.45 + min(0.45, band_energy / 1000) - max(0, average_db - 62) / 100))
    weight_slope = linear_slope(weights)
    foraging = min(100.0, max(0.0, 55 + weight_slope * 20))
    swarm = min(100.0, max(0.0, agitation * 0.55 + max(0, weight_slope) * 12 + max(0, sum(humidity) / len(humidity) - 72)))
    health = min(100.0, max(0.0, queen_right * 55 + (100 - agitation) * 0.2 + foraging * 0.25 - max(0, sum(temperatures) / len(temperatures) - 38) * 5))
    factors = []
    if queen_right < 0.55: factors.append("Weak 220-280 Hz queen-presence signature")
    if agitation > 60: factors.append("Elevated acoustic agitation")
    if weight_slope <= 0: factors.append("Weight trend is not increasing")
    if sum(humidity) / len(humidity) > 75: factors.append("High humidity across recent readings")
    return {"queenRightProbability": round(queen_right, 4), "agitationIndex": round(agitation, 2), "swarmRiskPct": round(swarm, 2), "foragingScore": round(foraging, 2), "overallHealth": round(health, 2), "factors": factors or ["No major rule-based risk factor detected"]}


def synthetic_yield_features(request: YieldRequest) -> list[float]:
    readings = request.last30DaysReadings
    weights = [number(item, "weightKg") for item in readings]
    humidity = [number(item, "humidity") for item in readings]
    temperatures = [number(item, "tempC") for item in readings]
    return [weights[-1] if weights else 25.0, linear_slope(weights), sum(humidity) / len(humidity) if humidity else 65.0, sum(temperatures) / len(temperatures) if temperatures else 32.0, float(request.month), request.lat, request.lng, float(len(readings))]


def fallback_yield(request: YieldRequest) -> tuple[float, list[float], int, list[dict[str, Any]]]:
    features = synthetic_yield_features(request)
    source_bonus = {"MUSTARD": 1.2, "LITCHI": 1.5, "EUCALYPTUS": 1.0, "JAMUN": 1.3, "MULTIFLORA": 1.1}.get(request.floralSource.upper(), 0.8)
    predicted = max(0.5, features[0] * 0.16 + features[1] * 4 + source_bonus + max(0, 70 - abs(features[2] - 62)) * 0.02)
    return round(predicted, 2), [round(predicted * 0.78, 2), round(predicted * 1.22, 2)], max(1, round(14 - features[1] * 2)), [{"feature": "current weight", "impact": round(features[0] * 0.16, 2)}, {"feature": "weight trend", "impact": round(features[1] * 4, 2)}, {"feature": "floral source", "impact": source_bonus}]


@app.post("/predict/yield")
def predict_yield(request: YieldRequest) -> dict[str, Any]:
    global _yield_model
    if _yield_model is None and YIELD_MODEL_PATH.exists():
        try:
            import joblib

            _yield_model = joblib.load(YIELD_MODEL_PATH)
        except Exception:
            _yield_model = None
    if _yield_model is not None:
        try:
            features = synthetic_yield_features(request)
            predicted = max(0.0, float(_yield_model.predict([features])[0]))
            return {"predictedKg": round(predicted, 2), "confidenceInterval": [round(predicted * 0.8, 2), round(predicted * 1.2, 2)], "daysToHarvest": 14, "drivers": [{"feature": "trained gradient boosting model", "impact": round(predicted, 2)}]}
        except Exception:
            pass
    predicted, interval, days, drivers = fallback_yield(request)
    return {"predictedKg": predicted, "confidenceInterval": interval, "daysToHarvest": days, "drivers": drivers}


@app.post("/detect/anomaly")
def detect_anomaly(request: AnomalyRequest) -> dict[str, Any]:
    readings = request.readings
    feature_rows = [[number(item, key) for key in ("tempC", "humidity", "weightKg", "soundDb")] for item in readings]
    predictions: list[int]
    try:
        from sklearn.ensemble import IsolationForest

        predictions = list(IsolationForest(contamination="auto", random_state=42).fit_predict(feature_rows)) if len(feature_rows) >= 5 else [1] * len(feature_rows)
    except Exception:
        predictions = []
        for row in feature_rows:
            predictions.append(1 if abs(row[0] - 35) < 5 and row[1] < 85 and row[2] > 0 and row[3] < 75 else -1)
    anomalies = []
    for index, (reading, prediction) in enumerate(zip(readings, predictions)):
        if prediction != -1:
            continue
        reasons = []
        if number(reading, "tempC") > 38 or number(reading, "tempC") < 32: reasons.append("thermal excursion")
        if number(reading, "humidity") > 80: reasons.append("high humidity")
        if number(reading, "weightKg") <= 0: reasons.append("invalid or missing weight")
        if number(reading, "soundDb") > 70: reasons.append("acoustic spike")
        anomalies.append({"timestamp": timestamp(reading, index), "reasons": reasons or ["multivariate isolation-forest outlier"]})
    return {"hiveId": request.hiveId, "anomalies": anomalies, "anomalyCount": len(anomalies), "model": "IsolationForest" if len(feature_rows) >= 5 else "rule-fallback"}
