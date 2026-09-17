# Honey Chain AI Service

FastAPI microservice for Honey Chain disease screening, colony health scoring, yield prediction, and telemetry anomaly detection.

## Local run

```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The service always has safe fallbacks. Disease prediction uses a deterministic colour-histogram heuristic until `disease_model.h5` exists. Yield prediction uses a deterministic feature model until `yield_model.joblib` exists. Anomaly detection falls back to rules if scikit-learn cannot load.

## Train models

Disease images must use this ImageFolder layout:

```text
data/disease/
  HEALTHY/
  VARROA_MITE/
  AMERICAN_FOULBROOD/
  CHALKBROOD/
```

```powershell
python train.py --data data/disease --output disease_model.h5
python train_yield.py --output yield_model.joblib
```

## Render

Create a Render Web Service from the repository. The included `render.yaml` uses the Dockerfile in this directory and exposes `/health` for health checks. Set `CORS_ORIGINS` to the deployed Vercel URL and any local development origin.
