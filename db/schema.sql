-- ============================================================
-- UPI Fraud Detection Platform — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ──────────────────────────────────────────────────

CREATE TYPE risk_tier AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE txn_decision AS ENUM ('ALLOW', 'FLAG', 'BLOCK');
CREATE TYPE fraud_type AS ENUM (
  'SIM_SWAP',
  'MULE_NETWORK',
  'PHISHING',
  'VELOCITY_ABUSE',
  'DEVICE_SPOOFING',
  'GEO_IMPOSSIBLE',
  'NIGHT_NEW_DEVICE',
  'LEGITIMATE'
);
CREATE TYPE txn_status AS ENUM ('PENDING', 'PROCESSED', 'REVIEWED', 'FALSE_POSITIVE', 'CONFIRMED_FRAUD');
CREATE TYPE admin_role AS ENUM ('ROLE_ANALYST', 'ROLE_SUPERADMIN');

-- ─── USERS ───────────────────────────────────────────────────────

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_handle        VARCHAR(100) UNIQUE NOT NULL,
  phone_masked      VARCHAR(20) NOT NULL,          -- e.g. +91-XXXXX-12345
  email_masked      VARCHAR(100),
  account_created   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_tier         risk_tier NOT NULL DEFAULT 'LOW',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login        TIMESTAMPTZ,
  otp_secret        VARCHAR(64),                   -- TOTP seed (hashed)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_upi_handle ON users(upi_handle);
CREATE INDEX idx_users_risk_tier  ON users(risk_tier);

-- ─── TRANSACTIONS ─────────────────────────────────────────────────

CREATE TABLE transactions (
  txn_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_handle          VARCHAR(100) NOT NULL REFERENCES users(upi_handle),
  merchant            VARCHAR(200) NOT NULL,
  merchant_category   VARCHAR(100),
  amount              NUMERIC(15, 2) NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'INR',
  timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_score          NUMERIC(5, 4) NOT NULL DEFAULT 0.0,  -- 0.0 – 1.0
  decision            txn_decision NOT NULL DEFAULT 'ALLOW',
  fraud_type          fraud_type NOT NULL DEFAULT 'LEGITIMATE',
  status              txn_status NOT NULL DEFAULT 'PROCESSED',
  analyst_override    BOOLEAN NOT NULL DEFAULT FALSE,
  override_by         VARCHAR(100),                        -- admin username
  override_at         TIMESTAMPTZ,
  override_reason     TEXT,
  device_id           VARCHAR(200),
  device_age_days     INTEGER,
  location_city       VARCHAR(100),
  location_country    CHAR(2) DEFAULT 'IN',
  ip_address          INET,
  shap_explanation    JSONB,                              -- SHAP feature contributions
  fraud_ring_id       UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_txn_upi_handle   ON transactions(upi_handle);
CREATE INDEX idx_txn_risk_score   ON transactions(risk_score DESC);
CREATE INDEX idx_txn_timestamp    ON transactions(timestamp DESC);
CREATE INDEX idx_txn_decision     ON transactions(decision);
CREATE INDEX idx_txn_fraud_type   ON transactions(fraud_type);
CREATE INDEX idx_txn_status       ON transactions(status);
CREATE INDEX idx_txn_created_at   ON transactions(created_at DESC);

-- ─── FRAUD RINGS ─────────────────────────────────────────────────

CREATE TABLE fraud_rings (
  ring_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ring_name           VARCHAR(200),
  member_handles      TEXT[] NOT NULL,              -- UPI handles in the ring
  total_amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  fraud_type          fraud_type NOT NULL DEFAULT 'MULE_NETWORK',
  geographic_spread   TEXT[],                       -- cities/states involved
  first_seen          TIMESTAMPTZ NOT NULL,
  last_seen           TIMESTAMPTZ NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  graph_data          JSONB,                        -- nodes + edges for visualization
  estimated_stolen    NUMERIC(18, 2) DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rings_fraud_type ON fraud_rings(fraud_type);
CREATE INDEX idx_rings_is_active  ON fraud_rings(is_active);

-- Add FK from transactions to fraud_rings
ALTER TABLE transactions
  ADD CONSTRAINT fk_txn_ring
  FOREIGN KEY (fraud_ring_id)
  REFERENCES fraud_rings(ring_id)
  ON DELETE SET NULL;

-- ─── ADMIN USERS ─────────────────────────────────────────────────

CREATE TABLE admin_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        VARCHAR(100) UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,                    -- bcrypt
  role            admin_role NOT NULL DEFAULT 'ROLE_ANALYST',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_username ON admin_users(username);

-- ─── MODEL RUNS ──────────────────────────────────────────────────

CREATE TABLE model_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version         VARCHAR(50) NOT NULL,
  accuracy        NUMERIC(6, 4),
  f1_score        NUMERIC(6, 4),
  precision_score NUMERIC(6, 4),
  recall_score    NUMERIC(6, 4),
  auc_roc         NUMERIC(6, 4),
  false_positive_rate NUMERIC(6, 4),
  confusion_matrix    JSONB,                        -- {tp, fp, tn, fn}
  feature_importance  JSONB,                        -- list of {feature, importance}
  training_samples    INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  trained_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at     TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX idx_model_runs_is_active ON model_runs(is_active);
CREATE INDEX idx_model_runs_trained_at ON model_runs(trained_at DESC);

-- ─── FRAUD REPORTS (user-submitted) ─────────────────────────────

CREATE TABLE fraud_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_handle      VARCHAR(100) NOT NULL REFERENCES users(upi_handle),
  txn_id          UUID REFERENCES transactions(txn_id),
  description     TEXT NOT NULL,
  contact_phone   VARCHAR(20),
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING, INVESTIGATING, RESOLVED
  analyst_notes   TEXT,
  assigned_to     VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOG ───────────────────────────────────────────────────

CREATE TABLE admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_username  VARCHAR(100) NOT NULL,
  action          VARCHAR(200) NOT NULL,
  target_id       UUID,
  target_type     VARCHAR(100),
  details         JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_admin   ON admin_audit_log(admin_username);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at DESC);

-- ─── UPDATE TRIGGERS ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_fraud_rings_updated_at
  BEFORE UPDATE ON fraud_rings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
