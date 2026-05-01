create schema if not exists trading;

create table if not exists trading.instruments (
  instrument_token bigint primary key,
  tradingsymbol text not null,
  exchange text not null,
  name text not null,
  segment text not null,
  instrument_type text not null,
  expiry date,
  strike numeric(14, 2),
  lot_size integer,
  refreshed_at timestamptz not null default now()
);

create table if not exists trading.candles (
  instrument_token bigint not null,
  ts timestamptz not null,
  open numeric(14, 4) not null,
  high numeric(14, 4) not null,
  low numeric(14, 4) not null,
  close numeric(14, 4) not null,
  volume numeric(18, 2) not null,
  oi numeric(18, 2),
  primary key (instrument_token, ts)
);

create table if not exists trading.option_snapshots (
  instrument_token bigint not null,
  ts timestamptz not null,
  last_price numeric(14, 4) not null,
  open_interest numeric(18, 2) not null,
  oi_delta numeric(18, 2) not null,
  price_delta numeric(14, 4) not null,
  volume numeric(18, 2) not null,
  primary key (instrument_token, ts)
);

create table if not exists trading.sentiment_events (
  id text primary key,
  headline text not null,
  source text not null,
  url text,
  published_at timestamptz not null,
  sentiment_label text not null,
  sentiment_score numeric(5, 4) not null
);

create table if not exists trading.signals (
  id bigserial primary key,
  index_symbol text not null,
  action text not null,
  entry_price numeric(14, 4),
  target_price numeric(14, 4),
  stop_loss numeric(14, 4),
  confidence numeric(5, 2) not null,
  reasons jsonb not null,
  generated_at timestamptz not null
);

create table if not exists trading.order_intents (
  proposal_id uuid primary key,
  index_symbol text not null,
  signal_action text not null,
  tradingsymbol text not null,
  exchange text not null,
  product text not null,
  order_type text not null,
  quantity integer not null,
  limit_price numeric(14, 4) not null,
  status text not null,
  broker_order_id text,
  reasons jsonb not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists trading.risk_state (
  id boolean primary key default true,
  live_orders_enabled boolean not null default false,
  kill_switch_enabled boolean not null default false,
  daily_realized_pnl numeric(14, 2) not null default 0,
  daily_loss_limit numeric(14, 2) not null default 2500,
  updated_at timestamptz not null default now(),
  constraint one_risk_state_row check (id)
);

