-- ================================================================
-- ÉTAT DE CRISE — Schéma de référence complet
-- Version cible (base minimale corrigée)
-- Ce fichier est documentaire : les tables sont créées via les
-- fichiers migrations/00X_*.sql
-- ================================================================

-- ================================================================
-- USERS
-- ================================================================
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  display_name            TEXT NOT NULL,
  auth_provider           TEXT NOT NULL CHECK (auth_provider IN ('google', 'apple', 'anonymous')),
  revenuecat_customer_id  TEXT UNIQUE,          -- 1 par user, pas par achat
  banned_until            TIMESTAMPTZ,
  last_seen_at            TIMESTAMPTZ
);

-- ================================================================
-- DEVICES
-- ================================================================
CREATE TABLE devices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  install_id       TEXT NOT NULL UNIQUE,         -- UUID généré au 1er lancement côté app
  platform         TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version      TEXT NOT NULL,
  integrity_status TEXT NOT NULL DEFAULT 'unknown'
                     CHECK (integrity_status IN ('unknown', 'valid', 'invalid', 'rooted')),
  push_token       TEXT,
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);

-- ================================================================
-- SAVES
-- ================================================================
CREATE TABLE saves (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_index SMALLINT NOT NULL DEFAULT 0,        -- multi-slot prévu dès maintenant
  save_json  JSONB NOT NULL,
  version    INT NOT NULL DEFAULT 1,
  UNIQUE (user_id, slot_index)
);

-- ================================================================
-- RANKED RUNS
-- ================================================================
CREATE TABLE ranked_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed              BIGINT NOT NULL,
  country_id        TEXT NOT NULL,               -- 'FR', 'US', etc.
  status            TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed', 'abandoned', 'invalidated')),
  validation_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (validation_status IN ('pending', 'valid', 'invalid', 'suspicious')),
  score             BIGINT,                      -- NULL tant que non terminée
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  app_version       TEXT NOT NULL
);

CREATE INDEX idx_ranked_runs_user_id ON ranked_runs(user_id);
CREATE INDEX idx_ranked_runs_status  ON ranked_runs(status);

-- ================================================================
-- RUN EVENTS  (replay + anti-cheat)
-- ================================================================
CREATE TABLE run_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranked_run_id      UUID NOT NULL REFERENCES ranked_runs(id) ON DELETE CASCADE,
  event_index        INT NOT NULL,               -- ordre garanti côté client
  event_type         TEXT NOT NULL,
  payload            JSONB NOT NULL DEFAULT '{}',
  client_timestamp   TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- anti-cheat : comparer les deux
  UNIQUE (ranked_run_id, event_index)
);

CREATE INDEX idx_run_events_run_id ON run_events(ranked_run_id);

-- ================================================================
-- LEADERBOARD ENTRIES
-- ================================================================
CREATE TABLE leaderboard_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ranked_run_id UUID NOT NULL REFERENCES ranked_runs(id) ON DELETE CASCADE,
  score         BIGINT NOT NULL,
  season        INT NOT NULL,
  country_id    TEXT NOT NULL,
  UNIQUE (user_id, season)                       -- 1 score par joueur par saison
);

CREATE INDEX idx_leaderboard_season_score ON leaderboard_entries(season, score DESC);
CREATE INDEX idx_leaderboard_country      ON leaderboard_entries(country_id, season, score DESC);

-- ================================================================
-- PURCHASES
-- ================================================================
CREATE TABLE purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform                 TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  entitlement              TEXT NOT NULL,        -- 'premium', 'season_pass', etc.
  status                   TEXT NOT NULL CHECK (status IN ('active', 'expired', 'refunded', 'grace_period')),
  original_transaction_id  TEXT NOT NULL UNIQUE, -- ID store Apple/Google, reçu de RevenueCat
  expires_at               TIMESTAMPTZ           -- NULL = lifetime
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
