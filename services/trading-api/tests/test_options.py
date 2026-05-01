from datetime import datetime, timedelta, timezone

from app.domain.options import OI_LONG_BUILDUP, OI_SHORT_BUILDUP, InstrumentMasterParser, PCRTracker, classify_oi
from app.schemas import OptionContract, OptionSnapshot


def test_instrument_parser_builds_nearest_expiry_option_slice():
    now = datetime(2026, 5, 1, tzinfo=timezone.utc)
    records = [
        {
            "instrument_token": "1",
            "tradingsymbol": "BANKNIFTY26MAY48500CE",
            "exchange": "NFO",
            "name": "BANKNIFTY",
            "segment": "NFO-OPT",
            "instrument_type": "CE",
            "expiry": "2026-05-07",
            "strike": "48500",
            "lot_size": "15",
        },
        {
            "instrument_token": "2",
            "tradingsymbol": "BANKNIFTY26MAY48500PE",
            "exchange": "NFO",
            "name": "BANKNIFTY",
            "segment": "NFO-OPT",
            "instrument_type": "PE",
            "expiry": "2026-05-07",
            "strike": "48500",
            "lot_size": "15",
        },
        {
            "instrument_token": "3",
            "tradingsymbol": "BANKNIFTY26JUN48500CE",
            "exchange": "NFO",
            "name": "BANKNIFTY",
            "segment": "NFO-OPT",
            "instrument_type": "CE",
            "expiry": "2026-06-25",
            "strike": "48500",
            "lot_size": "15",
        },
    ]
    parser = InstrumentMasterParser()
    contracts = parser.contracts_from_records(records, today=now)
    selected = parser.build_chain_contracts(contracts, "BANKNIFTY", 48510, today=now)
    assert len(selected) == 2
    assert {contract.option_type for contract in selected} == {"CE", "PE"}
    assert all(contract.expiry.date().isoformat() == "2026-05-07" for contract in selected)


def test_pcr_tracker_velocity_and_oi_matrix():
    now = datetime.now(timezone.utc)
    contract_ce = OptionContract(
        instrument_token=1,
        tradingsymbol="NIFTYCE",
        name="NIFTY",
        expiry=now,
        strike=22500,
        option_type="CE",
        lot_size=25,
    )
    contract_pe = contract_ce.model_copy(update={"instrument_token": 2, "tradingsymbol": "NIFTYPE", "option_type": "PE"})
    tracker = PCRTracker()
    first = tracker.update(
        "NIFTY",
        [
            OptionSnapshot(contract=contract_ce, last_price=100, open_interest=100, ts=now),
            OptionSnapshot(contract=contract_pe, last_price=100, open_interest=90, ts=now),
        ],
        now,
    )
    second = tracker.update(
        "NIFTY",
        [
            OptionSnapshot(contract=contract_ce, last_price=100, open_interest=100, ts=now + timedelta(minutes=2)),
            OptionSnapshot(contract=contract_pe, last_price=100, open_interest=120, ts=now + timedelta(minutes=2)),
        ],
        now + timedelta(minutes=2),
    )
    assert first.pcr == 0.9
    assert round(second.velocity_5m, 2) == 0.3
    assert classify_oi(spot_delta=10, oi_delta=100) == OI_LONG_BUILDUP
    assert classify_oi(spot_delta=-10, oi_delta=100) == OI_SHORT_BUILDUP

