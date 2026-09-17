# ai-service/train_yield.py
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np


def build_dataset(samples: int, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    current_weight = rng.uniform(18, 55, samples)
    weight_trend = rng.uniform(-0.15, 0.65, samples)
    humidity = rng.uniform(40, 88, samples)
    temperature = rng.uniform(25, 42, samples)
    month = rng.integers(1, 13, samples)
    lat = rng.uniform(8, 35, samples)
    lng = rng.uniform(68, 90, samples)
    reading_count = rng.integers(24, 720, samples)
    features = np.column_stack([current_weight, weight_trend, humidity, temperature, month, lat, lng, reading_count])
    yield_kg = current_weight * 0.16 + weight_trend * 4 + np.maximum(0, 70 - np.abs(humidity - 62)) * 0.02 + rng.normal(0, 0.7, samples)
    return features, np.maximum(0.5, yield_kg)


def train(output_path: Path, samples: int) -> None:
    try:
        import joblib
        from sklearn.ensemble import GradientBoostingRegressor
    except ImportError as error:
        raise SystemExit("scikit-learn and joblib are required for yield training.") from error

    features, target = build_dataset(samples)
    model = GradientBoostingRegressor(random_state=42, n_estimators=120, max_depth=2, learning_rate=0.04, loss="huber")
    model.fit(features, target)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    print(f"Saved yield model to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the synthetic Honey Chain yield model.")
    parser.add_argument("--output", type=Path, default=Path("yield_model.joblib"))
    parser.add_argument("--samples", type=int, default=3000)
    arguments = parser.parse_args()
    train(arguments.output, arguments.samples)
