CREATE TABLE user_accounts (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE market_snapshots (
    id BIGSERIAL PRIMARY KEY,
    trading_date DATE NOT NULL,
    symbol VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    close_value DOUBLE PRECISION NOT NULL,
    change_percent DOUBLE PRECISION NOT NULL,
    source VARCHAR(128) NOT NULL,
    market_region VARCHAR(64),
    country VARCHAR(128),
    session VARCHAR(64),
    trading_view_symbol VARCHAR(128),
    captured_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE market_news (
    id BIGSERIAL PRIMARY KEY,
    published_at TIMESTAMPTZ NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    headline VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    thumbnail_label VARCHAR(80),
    thumbnail_theme VARCHAR(80),
    thumbnail_accent VARCHAR(16),
    thumbnail_alt VARCHAR(255),
    source_url TEXT NOT NULL,
    sentiment_score DOUBLE PRECISION NOT NULL,
    entity_name VARCHAR(128) NOT NULL,
    entity_match_score DOUBLE PRECISION NOT NULL,
    category VARCHAR(64) NOT NULL
);

CREATE INDEX idx_market_news_published_at ON market_news (published_at);
CREATE INDEX idx_market_news_category ON market_news (category);

CREATE TABLE narrative_themes (
    id BIGSERIAL PRIMARY KEY,
    digest_date DATE NOT NULL,
    theme_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    sentiment_score DOUBLE PRECISION NOT NULL,
    evidence_count INTEGER NOT NULL
);

CREATE TABLE trade_setups (
    id BIGSERIAL PRIMARY KEY,
    digest_date DATE NOT NULL,
    symbol VARCHAR(64) NOT NULL,
    direction VARCHAR(32) NOT NULL,
    entry_price DOUBLE PRECISION NOT NULL,
    stop_loss DOUBLE PRECISION NOT NULL,
    target_price DOUBLE PRECISION NOT NULL,
    risk_reward DOUBLE PRECISION NOT NULL,
    confidence_reason TEXT NOT NULL,
    invalidation_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE daily_scripts (
    id BIGSERIAL PRIMARY KEY,
    digest_date DATE NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    one_page_summary TEXT NOT NULL,
    teleprompter_script TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    overall_sentiment DOUBLE PRECISION NOT NULL,
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE asset_generations (
    id BIGSERIAL PRIMARY KEY,
    digest_date DATE NOT NULL,
    sentiment_label VARCHAR(32) NOT NULL,
    positive_prompt TEXT NOT NULL,
    negative_prompt TEXT NOT NULL,
    palette VARCHAR(255) NOT NULL,
    reference_image_id VARCHAR(128) NOT NULL,
    control_net_mode VARCHAR(64) NOT NULL,
    asset_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
