import asyncio
from datetime import datetime, timedelta, timezone

from app.config import Settings
from app.state import TradingState

# Always use a Thursday that is at least 7 days in the future so the
# InstrumentMasterParser never filters contracts as expired.
def _next_expiry() -> str:
    today = datetime.now(timezone.utc).date()
    days_ahead = (3 - today.weekday()) % 7 or 7   # next Thursday
    return (today + timedelta(days=days_ahead + 7)).strftime("%Y-%m-%d")


class TokenStore:
    def __init__(self, valid=True):
        self.valid = valid

    def token_valid(self):
        return self.valid


class Auth:
    def __init__(self, valid=True):
        self.token_store = TokenStore(valid)


class FakeKiteClient:
    def __init__(self, valid=True, fail_ltp=False, fail_quote=False, empty_nifty_history=False):
        self.auth = Auth(valid)
        self.fail_ltp = fail_ltp
        self.fail_quote = fail_quote
        self.empty_nifty_history = empty_nifty_history
        self.quote_oi = 100000.0

    async def instruments(self):
        expiry = _next_expiry()
        return "\n".join(
            [
                "instrument_token,exchange,tradingsymbol,name,segment,instrument_type,expiry,strike,lot_size",
                f"101,NFO,NIFTY22500CE,NIFTY,NFO-OPT,CE,{expiry},22500,25",
                f"102,NFO,NIFTY22500PE,NIFTY,NFO-OPT,PE,{expiry},22500,25",
                f"201,NFO,BANKNIFTY48500CE,BANKNIFTY,NFO-OPT,CE,{expiry},48500,15",
                f"202,NFO,BANKNIFTY48500PE,BANKNIFTY,NFO-OPT,PE,{expiry},48500,15",
            ]
        )

    async def ltp(self, instruments):
        if self.fail_ltp:
            raise RuntimeError("403 quote forbidden")
        return {
            "NSE:NIFTY 50": {"last_price": 22510.0},
            "NSE:NIFTY BANK": {"last_price": 48520.0},
        }

    async def historical(self, instrument_token, interval, from_ts, to_ts, continuous=False, oi=False):
        if self.empty_nifty_history and instrument_token == 256265:
            return {"candles": []}
        base = 22500 if instrument_token == 256265 else 48500 if instrument_token == 260105 else 100
        return {
            "candles": [
                ["2026-05-02T09:15:00+0530", base + i, base + 4 + i, base - 2 + i, base + 2 + i, 1000 + i, 100000 + i]
                for i in range(30)
            ]
        }

    async def quote(self, instruments):
        if self.fail_quote:
            raise RuntimeError("403 quote forbidden")
        return {
            instrument: {
                "last_price": 100.0,
                "oi": self.quote_oi,
                "volume": 1000.0,
                "ohlc": {"close": 98.0},
                "timestamp": "2026-05-02T09:45:00+0530",
            }
            for instrument in instruments
        }


def test_kite_mode_without_session_never_shows_mock_data():
    asyncio.run(_kite_mode_without_session_never_shows_mock_data())


async def _kite_mode_without_session_never_shows_mock_data():
    state = TradingState(Settings(trading_market_mode="kite", kite_api_key="key"))
    await state.bootstrap()
    await state.refresh_from_kite(FakeKiteClient(valid=False))
    envelope = state.envelope()
    assert envelope.status.mode == "kite"
    assert not envelope.status.is_live
    assert "missing or expired" in envelope.status.message
    assert envelope.candles["NIFTY"] == []
    assert envelope.option_chains == {}



def test_kite_refresh_builds_live_envelope_from_kite_payloads():
    asyncio.run(_kite_refresh_builds_live_envelope_from_kite_payloads())


async def _kite_refresh_builds_live_envelope_from_kite_payloads():
    state = TradingState(Settings(trading_market_mode="kite", kite_api_key="key", kite_refresh_seconds=0))
    await state.bootstrap()
    await state.refresh_from_kite(FakeKiteClient(valid=True))
    envelope = state.envelope()
    assert envelope.status.is_live
    assert envelope.status.kite_session_valid
    assert envelope.candles["NIFTY"]
    assert envelope.option_chains["NIFTY"].snapshots
    assert envelope.option_chains["BANKNIFTY"].snapshots


def test_kite_quote_refresh_tracks_option_oi_delta():
    asyncio.run(_kite_quote_refresh_tracks_option_oi_delta())


async def _kite_quote_refresh_tracks_option_oi_delta():
    state = TradingState(Settings(trading_market_mode="kite", kite_api_key="key", kite_refresh_seconds=0))
    client = FakeKiteClient(valid=True)
    await state.bootstrap()
    await state.refresh_from_kite(client)
    client.quote_oi = 101250.0
    await state.refresh_from_kite(client)
    deltas = [snapshot.oi_delta for snapshot in state.envelope().option_chains["NIFTY"].snapshots]
    assert deltas
    assert all(delta == 1250.0 for delta in deltas)


def test_kite_refresh_seeds_nifty_chart_when_history_is_empty():
    asyncio.run(_kite_refresh_seeds_nifty_chart_when_history_is_empty())


async def _kite_refresh_seeds_nifty_chart_when_history_is_empty():
    state = TradingState(Settings(trading_market_mode="kite", kite_api_key="key", kite_refresh_seconds=0))
    await state.bootstrap()
    await state.refresh_from_kite(FakeKiteClient(valid=True, empty_nifty_history=True))
    envelope = state.envelope()
    assert envelope.candles["NIFTY"]
    assert len(envelope.candles["NIFTY"]) == 2
    assert envelope.technicals["NIFTY"]
    assert "NIFTY seeded" in envelope.status.message


def test_kite_refresh_falls_back_when_ltp_and_quote_are_forbidden():
    asyncio.run(_kite_refresh_falls_back_when_ltp_and_quote_are_forbidden())


async def _kite_refresh_falls_back_when_ltp_and_quote_are_forbidden():
    state = TradingState(
        Settings(
            trading_market_mode="kite",
            kite_api_key="key",
            kite_refresh_seconds=0,
            kite_option_history_fallback_limit=4,
        )
    )
    await state.bootstrap()
    await state.refresh_from_kite(FakeKiteClient(valid=True, fail_ltp=True, fail_quote=True))
    envelope = state.envelope()
    assert envelope.status.is_live
    assert "fallback" in envelope.status.message.lower()
    assert envelope.candles["NIFTY"]
    assert envelope.option_chains["NIFTY"].snapshots
    assert any(snapshot.oi_delta != 0 for snapshot in envelope.option_chains["NIFTY"].snapshots)
