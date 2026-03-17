"""
UPI Fraud Detection — FastAPI ML Service
POST /score  →  risk score + decision + SHAP explanation
GET  /health →  service health check
"""

import os
import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from scorer import FraudScorer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="UPI Fraud Detection ML Service",
    description="Real-time transaction scoring with XGBoost + LSTM + Graph NN ensemble",
    version="2.4.1",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Initialise scorer once at startup
scorer: Optional[FraudScorer] = None


@app.on_event("startup")
async def startup_event():
    global scorer
    logger.info("Initialising FraudScorer ensemble...")
    scorer = FraudScorer(redis_url=REDIS_URL)
    logger.info("ML service ready.")


# ─── Request / Response Models ───────────────────────────────────────────

class TransactionRequest(BaseModel):
    txn_id:                      str   = Field(..., example="txn-abc-123")
    upi_handle:                  str   = Field(..., example="rahul.sharma@okaxis")
    amount:                      float = Field(..., ge=1, example=45000.00)
    merchant:                    str   = Field(..., example="UPI Transfer")
    merchant_category:           str   = Field(default="P2P", example="P2P")
    merchant_trust_score:        float = Field(default=0.7, ge=0.0, le=1.0)
    device_id:                   Optional[str]   = None
    device_age_days:             float = Field(default=365, ge=0)
    is_emulator:                 int   = Field(default=0, ge=0, le=1)
    biometric_delta:             float = Field(default=0.0, ge=0.0, le=1.0)
    sim_change_flag:             int   = Field(default=0, ge=0, le=1)
    location_city:               Optional[str]   = None
    location_country:            str   = Field(default="IN", max_length=2)
    location_delta_km:           float = Field(default=0.0, ge=0)
    ip_reputation_score:         float = Field(default=0.8, ge=0.0, le=1.0)
    network_type_enc:            float = Field(default=1.0)
    beneficiary_new:             int   = Field(default=0, ge=0, le=1)
    beneficiary_txn_count:       int   = Field(default=0, ge=0)
    graph_centrality:            float = Field(default=0.0, ge=0.0, le=1.0)
    graph_cluster_size:          float = Field(default=1.0, ge=1.0)
    txn_amount_to_balance_ratio: float = Field(default=0.1, ge=0.0)
    daily_spend_pct:             float = Field(default=1.0, ge=0.0)
    upi_handle_age_days:         float = Field(default=365, ge=0)
    has_prev_fraud_flag:         int   = Field(default=0, ge=0, le=1)
    time_since_last_txn_mins:    float = Field(default=60, ge=0)
    recurring_txn_score:         float = Field(default=0.5, ge=0.0, le=1.0)
    merchant_first_time:         int   = Field(default=0, ge=0, le=1)
    festival_season_flag:        int   = Field(default=0, ge=0, le=1)


class HealthResponse(BaseModel):
    status: str
    model_version: str
    timestamp: str
    redis_connected: bool


# ─── Endpoints ───────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    redis_ok = False
    if scorer:
        try:
            scorer.redis.ping()
            redis_ok = True
        except Exception:
            pass
    return HealthResponse(
        status="healthy" if scorer else "initialising",
        model_version="v2.4.1",
        timestamp=datetime.utcnow().isoformat() + "Z",
        redis_connected=redis_ok,
    )


@app.post("/score", tags=["Scoring"])
async def score_transaction(txn: TransactionRequest):
    """
    Score a UPI transaction in real-time.
    Returns risk_score (0-1), decision (ALLOW/FLAG/BLOCK), fraud_type,
    per-model scores, and SHAP explanation in plain English.
    """
    if not scorer:
        raise HTTPException(status_code=503, detail="ML service is still initialising")

    try:
        result = scorer.score(txn.dict())
        return result
    except Exception as e:
        logger.exception("Scoring error for txn %s: %s", txn.txn_id, e)
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.post("/score/batch", tags=["Scoring"])
async def score_batch(transactions: list[TransactionRequest]):
    """Score multiple transactions in one call (max 100)."""
    if not scorer:
        raise HTTPException(status_code=503, detail="ML service is still initialising")
    if len(transactions) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 transactions per batch")
    results = []
    for txn in transactions:
        try:
            results.append(scorer.score(txn.dict()))
        except Exception as e:
            results.append({"txn_id": txn.txn_id, "error": str(e)})
    return {"results": results, "total": len(results)}


@app.get("/model/info", tags=["Model"])
async def model_info():
    """Return current model version and feature list."""
    from scorer import FEATURE_NAMES
    return {
        "version": "v2.4.1",
        "features": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "ensemble_weights": {
            "xgboost": 0.40,
            "lstm":    0.30,
            "graph_nn":0.20,
            "rules":   0.10,
        },
        "decision_thresholds": {
            "block": 0.80,
            "flag":  0.45,
            "allow": "< 0.45",
        },
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
