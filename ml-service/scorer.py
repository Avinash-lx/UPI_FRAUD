"""
UPI Fraud Detection — ML Scorer
XGBoost (40%) + LSTM stub (30%) + Graph NN stub (20%) + Rule Engine (10%)
Ensemble with SHAP explainability
"""

import json
import math
import time
import random
import logging
from datetime import datetime
from typing import Any, Optional
import numpy as np
import redis as redis_client
import xgboost as xgb
import shap

logger = logging.getLogger(__name__)

# ─── Feature Names (34 features) ───────────────────────────────────────────

FEATURE_NAMES = [
    "txn_velocity_1h",        # 0  number of txns in last 1h
    "txn_velocity_24h",       # 1  number of txns in last 24h
    "amount",                 # 2  transaction amount (INR)
    "amount_percentile",      # 3  amount percentile vs user history (0-1)
    "device_age_days",        # 4  days since device first used
    "is_new_device",          # 5  boolean (0/1)
    "is_emulator",            # 6  emulator detection (0/1)
    "biometric_delta",        # 7  biometric match score delta (0-1)
    "sim_change_flag",        # 8  SIM card changed recently (0/1)
    "location_delta_km",      # 9  km from last known location
    "hour_of_day",            # 10 0-23
    "is_night",               # 11 1 if between 23:00-05:00
    "day_of_week",            # 12 0-6 (0=Monday)
    "upi_handle_age_days",    # 13 account age in days
    "merchant_trust_score",   # 14 0-1 trust score for merchant
    "merchant_category_enc",  # 15 encoded merchant category
    "is_crypto_merchant",     # 16 1 if category is CRYPTO/FOREX
    "beneficiary_new",        # 17 1 if first time sending to this beneficiary
    "beneficiary_txn_count",  # 18 how many times sent to this beneficiary
    "graph_centrality",       # 19 account graph centrality (mule detection)
    "graph_cluster_size",     # 20 cluster size in fraud graph
    "txn_amount_to_balance_ratio", # 21
    "daily_spend_pct",        # 22 today's spend / monthly avg
    "location_country_enc",   # 23 encoded country (0=India)
    "is_international",       # 24 1 if non-India location
    "card_present",           # 25 0 for UPI (always 0 baseline)
    "ip_reputation_score",    # 26 0-1 (0=bad, 1=clean)
    "network_type_enc",       # 27 0=WiFi known, 1=cellular, 2=unknown WiFi
    "has_prev_fraud_flag",     # 28 user has had prior fraud flag
    "time_since_last_txn_mins",# 29 minutes since last transaction
    "recurring_txn_score",     # 30 how routine this txn pattern is (0-1)
    "merchant_first_time",     # 31 first time transacting at this merchant
    "weekend_flag",            # 32 1 if Saturday/Sunday
    "festival_season_flag",    # 33 1 during major festivals (higher fraud)
]

MERCHANT_CATEGORY_MAP = {
    "P2P": 0, "ECOMMERCE": 1, "FOOD": 2, "TRANSPORT": 3,
    "GROCERY": 4, "UTILITY": 5, "TELECOM": 6, "TRAVEL": 7,
    "HEALTHCARE": 8, "INSURANCE": 9, "EDUCATION": 10,
    "ENTERTAINMENT": 11, "FUEL": 12, "PHARMACY": 13,
    "INVESTMENTS": 14, "FINTECH": 15, "CRYPTO": 16, "FOREX": 17,
    "ATM": 18, "WALLET": 19, "OTHER": 20,
}

CRYPTO_CATEGORIES = {"CRYPTO", "FOREX"}

# Plain-English templates for SHAP feature explanations
FEATURE_EXPLANATIONS = {
    "txn_velocity_1h":       "{val:.0f} transactions in the last hour",
    "txn_velocity_24h":      "{val:.0f} transactions in the last 24 hours",
    "amount":                "transaction amount of ₹{val:,.0f}",
    "amount_percentile":     "amount is at the {pct:.0f}th percentile of your history",
    "device_age_days":       "device only {val:.0f} day(s) old",
    "is_new_device":         "transaction from a new, unrecognized device",
    "is_emulator":           "device detected as an emulator or virtual machine",
    "biometric_delta":       "biometric mismatch score of {val:.0f}%",
    "sim_change_flag":       "SIM card was recently replaced",
    "location_delta_km":     "location jumped {val:,.0f} km from your last known location",
    "hour_of_day":           "transaction at {val:.0f}:00 (unusual hour)",
    "is_night":              "transaction during late-night hours (11 PM – 5 AM)",
    "upi_handle_age_days":   "UPI account only {val:.0f} days old",
    "merchant_trust_score":  "merchant has a low trust score ({val:.0f}%)",
    "is_crypto_merchant":    "payment to a high-risk crypto/forex merchant",
    "beneficiary_new":       "payment to a first-time beneficiary",
    "graph_centrality":      "account shows mule network characteristics (centrality score)",
    "is_international":      "transaction initiated from outside India",
    "has_prev_fraud_flag":   "your account was previously flagged for suspicious activity",
    "ip_reputation_score":   "transaction from a low-reputation IP address",
    "weekend_flag":          "high-risk weekend transaction pattern",
    "daily_spend_pct":       "today's spending is {val:.0f}x your daily average",
}


class RuleEngine:
    """NPCI-style heuristic rules. Returns a 0-1 risk boost."""

    def score(self, features: dict[str, Any]) -> float:
        risk = 0.0
        # Rule 1: SIM swap + new device = very high risk
        if features.get("sim_change_flag", 0) and features.get("is_new_device", 0):
            risk = max(risk, 0.90)
        # Rule 2: Emulator detected
        if features.get("is_emulator", 0):
            risk = max(risk, 0.95)
        # Rule 3: Geo-impossible (> 2000 km in < 60 min)
        if features.get("location_delta_km", 0) > 2000:
            risk = max(risk, 0.88)
        # Rule 4: Velocity abuse
        if features.get("txn_velocity_1h", 0) > 20:
            risk = max(risk, 0.80)
        # Rule 5: Crypto + new device
        if features.get("is_crypto_merchant", 0) and features.get("is_new_device", 0):
            risk = max(risk, 0.85)
        # Rule 6: Night + new device + P2P
        if (features.get("is_night", 0) and features.get("is_new_device", 0)
                and features.get("merchant_category_enc", -1) == MERCHANT_CATEGORY_MAP["P2P"]):
            risk = max(risk, 0.75)
        return risk


class LSTMStub:
    """
    Stub for LSTM behaviour sequence model.
    In production this would load a TensorFlow/PyTorch LSTM.
    """

    def score(self, features: dict[str, Any]) -> float:
        # Simulate temporal behaviour scoring
        velocity_score = min(features.get("txn_velocity_1h", 0) / 30.0, 1.0)
        night_score = 0.3 if features.get("is_night", 0) else 0.0
        new_device_score = 0.4 if features.get("is_new_device", 0) else 0.0
        recurring = features.get("recurring_txn_score", 0.8)
        return min((velocity_score * 0.5 + night_score + new_device_score) * (1 - recurring * 0.3), 1.0)


class GraphNNStub:
    """
    Stub for Graph Neural Network mule account detection.
    In production this would query a running GNN service.
    """

    def score(self, features: dict[str, Any]) -> float:
        centrality = features.get("graph_centrality", 0.0)
        cluster_size = min(features.get("graph_cluster_size", 1) / 10.0, 1.0)
        prev_flag = 0.3 if features.get("has_prev_fraud_flag", 0) else 0.0
        return min(centrality * 0.6 + cluster_size * 0.3 + prev_flag, 1.0)


class XGBoostModel:
    """Main XGBoost tabular fraud model with SHAP explainability."""

    def __init__(self):
        self.model: Optional[xgb.Booster] = None
        self.explainer: Optional[shap.TreeExplainer] = None
        self._load_or_init()

    def _load_or_init(self):
        """Load saved model, or create a synthetic training-free model for demo."""
        try:
            self.model = xgb.Booster()
            self.model.load_model("/app/models/xgb_fraud_v2.json")
            logger.info("XGBoost model loaded from disk")
        except Exception:
            logger.warning("No saved model found — initialising synthetic demo model")
            self.model = self._create_demo_model()

        try:
            self.explainer = shap.TreeExplainer(self.model)
        except Exception as e:
            logger.error("SHAP explainer init failed: %s", e)
            self.explainer = None

    def _create_demo_model(self) -> xgb.Booster:
        """
        Create a lightweight XGBoost model trained on synthetic data
        so that SHAP explanations work correctly.
        """
        np.random.seed(42)
        n = 2000
        X = np.zeros((n, len(FEATURE_NAMES)))
        y = np.zeros(n)

        for i in range(n):
            is_fraud = random.random() < 0.15
            y[i] = 1 if is_fraud else 0
            if is_fraud:
                X[i, 0]  = random.uniform(10, 30)   # velocity 1h
                X[i, 4]  = random.uniform(0, 5)      # device age days
                X[i, 5]  = random.randint(0, 1)      # new device
                X[i, 8]  = random.randint(0, 1)      # sim change
                X[i, 9]  = random.uniform(100, 8000) # location delta
                X[i, 10] = random.uniform(0, 5)      # hour (night)
                X[i, 11] = 1
                X[i, 19] = random.uniform(0.5, 1.0)  # centrality
                X[i, 2]  = random.uniform(5000, 200000)
                X[i, 3]  = random.uniform(0.7, 1.0)
                X[i, 14] = random.uniform(0.0, 0.4)
                X[i, 28] = random.randint(0, 1)
            else:
                X[i, 0]  = random.uniform(0, 5)
                X[i, 4]  = random.uniform(100, 1500)
                X[i, 10] = random.uniform(8, 20)
                X[i, 14] = random.uniform(0.6, 1.0)
                X[i, 13] = random.uniform(180, 1800)
                X[i, 2]  = random.uniform(100, 5000)
                X[i, 3]  = random.uniform(0.1, 0.6)

        dtrain = xgb.DMatrix(X, label=y, feature_names=FEATURE_NAMES)
        params = {
            "objective": "binary:logistic",
            "eval_metric": "auc",
            "max_depth": 6,
            "eta": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "n_estimators": 100,
            "seed": 42,
        }
        model = xgb.train(params, dtrain, num_boost_round=100, verbose_eval=False)
        return model

    def predict_with_shap(self, feature_vector: np.ndarray) -> tuple[float, dict]:
        dmat = xgb.DMatrix(feature_vector.reshape(1, -1), feature_names=FEATURE_NAMES)
        raw_score = float(self.model.predict(dmat)[0])

        shap_values = {}
        if self.explainer:
            try:
                sv = self.explainer.shap_values(dmat)
                for i, name in enumerate(FEATURE_NAMES):
                    shap_values[name] = float(sv[0][i])
            except Exception as e:
                logger.error("SHAP failed: %s", e)

        return raw_score, shap_values


class FraudScorer:
    """Main ensemble scorer coordinating all sub-models."""

    WEIGHTS = {
        "xgboost": 0.40,
        "lstm":    0.30,
        "graph":   0.20,
        "rules":   0.10,
    }

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.xgb_model  = XGBoostModel()
        self.lstm        = LSTMStub()
        self.graph_nn    = GraphNNStub()
        self.rules       = RuleEngine()
        self.redis       = redis_client.from_url(redis_url, decode_responses=True)
        logger.info("FraudScorer initialised with ensemble weights: %s", self.WEIGHTS)

    # ── Feature Extraction ──────────────────────────────────────────────

    def extract_features(self, txn: dict[str, Any]) -> tuple[np.ndarray, dict]:
        """Convert raw transaction dict into 34-dimensional feature vector."""
        now = datetime.utcnow()
        hour = now.hour
        dow  = now.weekday()  # Monday=0
        weekend = 1 if dow >= 5 else 0

        # Velocity from Redis feature store (defaults if missing)
        upi_handle = txn.get("upi_handle", "unknown")
        velocity_1h_key  = f"vel:1h:{upi_handle}"
        velocity_24h_key = f"vel:24h:{upi_handle}"
        try:
            v1h  = int(self.redis.get(velocity_1h_key)  or 0)
            v24h = int(self.redis.get(velocity_24h_key) or 0)
        except Exception:
            v1h, v24h = 0, 0

        amount = float(txn.get("amount", 0))
        device_age = float(txn.get("device_age_days", 365))
        is_new_device = 1 if device_age < 7 else 0
        loc_delta = float(txn.get("location_delta_km", 0))
        mc = txn.get("merchant_category", "OTHER").upper()
        mc_enc = MERCHANT_CATEGORY_MAP.get(mc, 20)
        is_crypto = 1 if mc in CRYPTO_CATEGORIES else 0
        merchant_trust = float(txn.get("merchant_trust_score", 0.7))
        beneficiary_new = int(txn.get("beneficiary_new", 0))

        feature_dict = {
            "txn_velocity_1h":           v1h,
            "txn_velocity_24h":          v24h,
            "amount":                    amount,
            "amount_percentile":         min(amount / 50000.0, 1.0),
            "device_age_days":           device_age,
            "is_new_device":             is_new_device,
            "is_emulator":               int(txn.get("is_emulator", 0)),
            "biometric_delta":           float(txn.get("biometric_delta", 0.0)),
            "sim_change_flag":           int(txn.get("sim_change_flag", 0)),
            "location_delta_km":         loc_delta,
            "hour_of_day":               hour,
            "is_night":                  1 if hour >= 23 or hour < 5 else 0,
            "day_of_week":               dow,
            "upi_handle_age_days":       float(txn.get("upi_handle_age_days", 365)),
            "merchant_trust_score":      merchant_trust,
            "merchant_category_enc":     float(mc_enc),
            "is_crypto_merchant":        float(is_crypto),
            "beneficiary_new":           float(beneficiary_new),
            "beneficiary_txn_count":     float(txn.get("beneficiary_txn_count", 0)),
            "graph_centrality":          float(txn.get("graph_centrality", 0.0)),
            "graph_cluster_size":        float(txn.get("graph_cluster_size", 1.0)),
            "txn_amount_to_balance_ratio": float(txn.get("txn_amount_to_balance_ratio", 0.1)),
            "daily_spend_pct":           float(txn.get("daily_spend_pct", 1.0)),
            "location_country_enc":      0.0 if txn.get("location_country", "IN") == "IN" else 1.0,
            "is_international":          0.0 if txn.get("location_country", "IN") == "IN" else 1.0,
            "card_present":              0.0,
            "ip_reputation_score":       float(txn.get("ip_reputation_score", 0.8)),
            "network_type_enc":          float(txn.get("network_type_enc", 1.0)),
            "has_prev_fraud_flag":       float(txn.get("has_prev_fraud_flag", 0)),
            "time_since_last_txn_mins":  float(txn.get("time_since_last_txn_mins", 60)),
            "recurring_txn_score":       float(txn.get("recurring_txn_score", 0.5)),
            "merchant_first_time":       float(txn.get("merchant_first_time", 0)),
            "weekend_flag":              float(weekend),
            "festival_season_flag":      float(txn.get("festival_season_flag", 0)),
        }

        vector = np.array([feature_dict[f] for f in FEATURE_NAMES], dtype=np.float32)
        return vector, feature_dict

    # ── Velocity Update ─────────────────────────────────────────────────

    def update_velocity(self, upi_handle: str):
        try:
            pipe = self.redis.pipeline()
            pipe.incr(f"vel:1h:{upi_handle}")
            pipe.expire(f"vel:1h:{upi_handle}", 3600)
            pipe.incr(f"vel:24h:{upi_handle}")
            pipe.expire(f"vel:24h:{upi_handle}", 86400)
            pipe.execute()
        except Exception as e:
            logger.warning("Redis velocity update failed: %s", e)

    # ── SHAP → Plain English ─────────────────────────────────────────────

    def explain_shap(self, shap_values: dict, feature_dict: dict,
                     risk_score: float, decision: str) -> dict:
        """Convert SHAP values to human-readable JSON explanation."""
        # Sort by absolute contribution
        sorted_features = sorted(
            [(k, v) for k, v in shap_values.items() if abs(v) > 0.01],
            key=lambda x: abs(x[1]),
            reverse=True
        )
        top_n = sorted_features[:5]

        sentences = []
        for feat, contrib in top_n:
            val = feature_dict.get(feat, 0)
            direction = "increased" if contrib > 0 else "decreased"
            template = FEATURE_EXPLANATIONS.get(feat)
            if template:
                try:
                    pct = val * 100
                    phrase = template.format(val=val, pct=pct)
                except Exception:
                    phrase = f"{feat} = {val:.2f}"
                sentences.append({
                    "feature": feat,
                    "contribution": round(contrib, 4),
                    "direction": direction,
                    "phrase": phrase,
                })

        plain_text = self._build_plain_text(decision, risk_score, sentences)

        return {
            "risk_score": round(risk_score, 4),
            "decision": decision,
            "plain_text": plain_text,
            "top_features": sentences,
            "all_shap_values": {k: round(v, 4) for k, v in shap_values.items()},
        }

    def _build_plain_text(self, decision: str, score: float, sentences: list) -> str:
        phrases = [s["phrase"] for s in sentences if s["direction"] == "increased"]
        reasons = " and ".join(phrases[:3]) if phrases else "multiple risk factors"

        if decision == "BLOCK":
            return (
                f"Your transaction was blocked (risk score: {score:.0%}). "
                f"This was triggered by: {reasons}. "
                "Please contact your bank if this was a legitimate payment."
            )
        elif decision == "FLAG":
            return (
                f"Your transaction was flagged for review (risk score: {score:.0%}) due to {reasons}. "
                "It may take a few minutes to complete."
            )
        else:
            return (
                f"Your transaction appears legitimate (risk score: {score:.0%}). "
                "No unusual patterns were detected."
            )

    # ── Main Score Method ────────────────────────────────────────────────

    def score(self, txn: dict[str, Any]) -> dict[str, Any]:
        start_ts = time.time()

        vector, feature_dict = self.extract_features(txn)

        # Model ensemble
        xgb_score, shap_values = self.xgb_model.predict_with_shap(vector)
        lstm_score              = self.lstm.score(feature_dict)
        graph_score             = self.graph_nn.score(feature_dict)
        rule_score              = self.rules.score(feature_dict)

        # Weighted ensemble
        ensemble_score = (
            xgb_score   * self.WEIGHTS["xgboost"] +
            lstm_score   * self.WEIGHTS["lstm"]    +
            graph_score  * self.WEIGHTS["graph"]   +
            rule_score   * self.WEIGHTS["rules"]
        )
        # Boost if rule engine flags hard red
        if rule_score >= 0.85:
            ensemble_score = max(ensemble_score, 0.85)

        ensemble_score = round(min(ensemble_score, 1.0), 4)

        # Decision
        if ensemble_score >= 0.80:
            decision = "BLOCK"
        elif ensemble_score >= 0.45:
            decision = "FLAG"
        else:
            decision = "ALLOW"

        # Fraud type inference
        fraud_type = self._infer_fraud_type(feature_dict, ensemble_score)

        # Explanation
        explanation = self.explain_shap(shap_values, feature_dict, ensemble_score, decision)

        # Update velocity counter
        self.update_velocity(txn.get("upi_handle", "unknown"))

        latency_ms = round((time.time() - start_ts) * 1000, 2)

        return {
            "txn_id":          txn.get("txn_id", ""),
            "upi_handle":      txn.get("upi_handle", ""),
            "risk_score":      ensemble_score,
            "decision":        decision,
            "fraud_type":      fraud_type,
            "model_scores": {
                "xgboost": round(xgb_score,  4),
                "lstm":    round(lstm_score,  4),
                "graph_nn":round(graph_score, 4),
                "rules":   round(rule_score,  4),
            },
            "explanation":     explanation,
            "latency_ms":      latency_ms,
            "model_version":   "v2.4.1",
            "timestamp":       datetime.utcnow().isoformat() + "Z",
        }

    def _infer_fraud_type(self, features: dict, score: float) -> str:
        if score < 0.45:
            return "LEGITIMATE"
        if features.get("is_emulator"):
            return "DEVICE_SPOOFING"
        if features.get("sim_change_flag") and features.get("is_new_device"):
            return "SIM_SWAP"
        if features.get("location_delta_km", 0) > 2000:
            return "GEO_IMPOSSIBLE"
        if features.get("txn_velocity_1h", 0) > 15:
            return "VELOCITY_ABUSE"
        if features.get("graph_centrality", 0) > 0.6:
            return "MULE_NETWORK"
        if features.get("beneficiary_new") and features.get("is_new_device"):
            return "PHISHING"
        if features.get("is_night") and features.get("is_new_device"):
            return "NIGHT_NEW_DEVICE"
        return "PHISHING"
