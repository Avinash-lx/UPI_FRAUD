# UPI Fraud Detection Platform

> **Real-Time AI-Powered UPI Fraud Detection** — Full-stack platform with React dashboard, Spring Boot API, Python ML ensemble (XGBoost + LSTM + GraphNN), PostgreSQL, Redis, Kafka, and Docker Compose.

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v2.x
- 8 GB RAM minimum (all services)

### Start Everything
```bash
cd trafficiq
docker compose up --build
```

| Service       | URL                               |
|---------------|-----------------------------------|
| **Frontend**  | http://localhost:3000             |
| **API**       | http://localhost:8080             |
| **ML Service**| http://localhost:8000/docs        |
| **PostgreSQL**| localhost:5432 (db: `frauddb`)    |
| **Redis**     | localhost:6379                    |
| **Kafka**     | localhost:9092                    |

---

## 🔐 Admin Login

| Username       | Password      | Role         |
|----------------|---------------|--------------|
| `superadmin`   | `Admin@1234`  | SUPERADMIN   |
| `analyst_priya`| `Admin@1234`  | ANALYST      |
| `analyst_rahul`| `Admin@1234`  | ANALYST      |

---

## 📁 Project Structure

```
trafficiq/
├── docker-compose.yml
├── db/
│   ├── schema.sql          # PostgreSQL schema
│   └── seed.sql            # 50 txns · 5 fraud rings · 3 admins
├── ml-service/             # Python FastAPI + XGBoost + SHAP
│   ├── main.py             # FastAPI app
│   ├── scorer.py           # Ensemble scoring + SHAP explainer
│   ├── requirements.txt
│   └── Dockerfile
├── backend/                # Spring Boot Java 21
│   ├── src/main/java/com/frauddetect/
│   │   ├── config/         # SecurityConfig, WebSocketConfig
│   │   ├── security/       # JwtTokenProvider, JwtAuthFilter
│   │   ├── controller/     # AdminController, UserController
│   │   └── service/        # TransactionScoringService
│   ├── src/main/resources/
│   │   └── application.yml
│   └── Dockerfile
└── frontend/               # React + Vite + Tailwind
    ├── src/
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx   # 6-section admin panel
    │   │   ├── UserDashboard.jsx    # Transaction history + alerts
    │   │   ├── UserQnA.jsx          # Conversational AI
    │   │   ├── LiveFeed.jsx         # WebSocket monitor
    │   │   ├── FraudAwarenessFeed.jsx
    │   │   └── Login.jsx
    │   └── components/
    │       └── LiveFeedPanel.jsx
    └── Dockerfile
```

---

## 🧠 ML Service API

```bash
# Score a transaction
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "txn_id": "demo-001",
    "upi_handle": "test@okaxis",
    "amount": 50000,
    "merchant": "UPI Transfer",
    "merchant_category": "P2P",
    "device_age_days": 1,
    "is_new_device": 1,
    "txn_velocity_1h": 18,
    "beneficiary_new": 1
  }'
```

Response includes `risk_score`, `decision` (ALLOW/FLAG/BLOCK), `fraud_type`, per-model scores, and SHAP plain-English explanation.

---

## 🛡️ Backend API Endpoints

| Method | Endpoint                            | Auth Required |
|--------|-------------------------------------|---------------|
| POST   | `/api/v1/txn/score`                 | None          |
| GET    | `/api/v1/user/{handle}/history`     | JWT           |
| POST   | `/api/v1/user/ask`                  | None          |
| POST   | `/api/v1/auth/admin/login`          | None          |
| GET    | `/api/v1/admin/stats/overview`      | ANALYST+      |
| GET    | `/api/v1/admin/stats/by-type`       | ANALYST+      |
| GET    | `/api/v1/admin/users/affected`      | ANALYST+      |
| GET    | `/api/v1/admin/rings`               | ANALYST+      |
| POST   | `/api/v1/admin/override/{id}`       | ANALYST+      |
| POST   | `/api/v1/admin/model/retrain`       | SUPERADMIN    |
| WS     | `/ws/fraud-stream`                  | None          |

---

## 🌐 Frontend Pages

| Route         | Page                     | Description                          |
|---------------|--------------------------|--------------------------------------|
| `/`           | User Dashboard           | Transaction history, fraud alerts    |
| `/ask`        | AI Assistant             | SHAP-explained Q&A chatbot           |
| `/live`       | Live Monitor             | Real-time WebSocket transaction feed |
| `/awareness`  | Fraud Awareness          | Anonymized fraud patterns + tips     |
| `/login`      | Admin Login              | JWT login for analysts               |
| `/admin`      | Admin Dashboard          | 6-section protected admin panel      |

---

## ⚙️ Environment Variables

All services are configured via `docker-compose.yml` environment sections.  
For local dev, the defaults in `application.yml` and `.env` files work out of the box.

**Change before production:**
- `JWT_SECRET` in docker-compose.yml
- Admin passwords (re-hash with bcrypt)
- PostgreSQL password

---

## 🧪 Development (without Docker)

```bash
# ML Service
cd ml-service && pip install -r requirements.txt && python main.py

# Backend (requires Java 21 + Maven)
cd backend && mvn spring-boot:run

# Frontend
cd frontend && npm install && npm run dev
```
