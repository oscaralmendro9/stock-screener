"""Curated futures contracts tracked by the futures dashboard.

Prices come from Yahoo continuous front-month symbols (``ES=F``). They roll
to the next contract near expiry without back-adjustment, so long-window
changes can include a roll gap; the dashboard labels them as front-month.

``cot_slug`` links a contract to its CFTC positioning instrument in
``app.domain.cot.registry`` when the CFTC reports it.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

FUTURES_REGISTRY_VERSION = "futures-curated-v1"


class FuturesCategory(str, Enum):
    EQUITY_INDEX = "equity_index"
    RATES = "rates"
    ENERGY = "energy"
    METALS = "metals"
    CURRENCIES = "currencies"
    CRYPTO = "crypto"
    GRAINS = "grains"
    SOFTS = "softs"
    LIVESTOCK = "livestock"


CATEGORY_LABELS: dict[FuturesCategory, str] = {
    FuturesCategory.EQUITY_INDEX: "Equity indices",
    FuturesCategory.RATES: "Rates",
    FuturesCategory.ENERGY: "Energy",
    FuturesCategory.METALS: "Metals",
    FuturesCategory.CURRENCIES: "Currencies",
    FuturesCategory.CRYPTO: "Crypto",
    FuturesCategory.GRAINS: "Grains & oilseeds",
    FuturesCategory.SOFTS: "Softs & lumber",
    FuturesCategory.LIVESTOCK: "Livestock",
}


@dataclass(frozen=True)
class FuturesContract:
    symbol: str
    root: str
    name: str
    category: FuturesCategory
    exchange: str
    cot_slug: str | None = None

    def __post_init__(self) -> None:
        if not self.symbol.endswith("=F"):
            raise ValueError(f"{self.symbol}: expected a Yahoo continuous symbol ending in =F")
        if not self.root or not self.name or not self.exchange:
            raise ValueError(f"{self.symbol}: root, name and exchange are required")


def _c(symbol, name, category, exchange, cot_slug=None) -> FuturesContract:
    return FuturesContract(
        symbol=symbol,
        root=symbol.removesuffix("=F"),
        name=name,
        category=category,
        exchange=exchange,
        cot_slug=cot_slug,
    )


_EQ = FuturesCategory.EQUITY_INDEX
_RATES = FuturesCategory.RATES
_ENERGY = FuturesCategory.ENERGY
_METALS = FuturesCategory.METALS
_FX = FuturesCategory.CURRENCIES
_CRYPTO = FuturesCategory.CRYPTO
_GRAINS = FuturesCategory.GRAINS
_SOFTS = FuturesCategory.SOFTS
_LIVESTOCK = FuturesCategory.LIVESTOCK

FUTURES_CONTRACTS: tuple[FuturesContract, ...] = (
    _c("ES=F", "E-mini S&P 500", _EQ, "CME", "sp-500"),
    _c("NQ=F", "E-mini Nasdaq-100", _EQ, "CME", "nasdaq-100"),
    _c("YM=F", "E-mini Dow", _EQ, "CBOT"),
    _c("RTY=F", "E-mini Russell 2000", _EQ, "CME", "russell-2000"),
    _c("NKD=F", "Nikkei 225 (USD)", _EQ, "CME", "nikkei"),
    _c("ZT=F", "2-Year T-Note", _RATES, "CBOT"),
    _c("ZF=F", "5-Year T-Note", _RATES, "CBOT"),
    _c("ZN=F", "10-Year T-Note", _RATES, "CBOT", "ust-10y"),
    _c("ZB=F", "30-Year T-Bond", _RATES, "CBOT"),
    _c("UB=F", "Ultra T-Bond", _RATES, "CBOT"),
    _c("CL=F", "WTI Crude Oil", _ENERGY, "NYMEX", "wti-crude"),
    _c("BZ=F", "Brent Crude Oil", _ENERGY, "NYMEX", "brent-crude"),
    _c("NG=F", "Henry Hub Natural Gas", _ENERGY, "NYMEX", "henry-hub-natural-gas"),
    _c("RB=F", "RBOB Gasoline", _ENERGY, "NYMEX", "rbob-gasoline"),
    _c("HO=F", "ULSD Heating Oil", _ENERGY, "NYMEX", "ulsd-heating-oil"),
    _c("GC=F", "Gold", _METALS, "COMEX", "gold"),
    _c("SI=F", "Silver", _METALS, "COMEX", "silver"),
    _c("HG=F", "Copper", _METALS, "COMEX", "copper"),
    _c("PL=F", "Platinum", _METALS, "NYMEX", "platinum"),
    _c("PA=F", "Palladium", _METALS, "NYMEX", "palladium"),
    _c("DX=F", "US Dollar Index", _FX, "ICE US", "usd-index"),
    _c("6E=F", "Euro FX", _FX, "CME"),
    _c("6J=F", "Japanese Yen", _FX, "CME", "japanese-yen"),
    _c("6B=F", "British Pound", _FX, "CME"),
    _c("6A=F", "Australian Dollar", _FX, "CME"),
    _c("6C=F", "Canadian Dollar", _FX, "CME"),
    _c("6S=F", "Swiss Franc", _FX, "CME"),
    _c("6M=F", "Mexican Peso", _FX, "CME"),
    _c("BTC=F", "Bitcoin", _CRYPTO, "CME", "bitcoin"),
    _c("ETH=F", "Ether", _CRYPTO, "CME", "ether"),
    _c("ZC=F", "Corn", _GRAINS, "CBOT", "corn"),
    _c("ZW=F", "Chicago SRW Wheat", _GRAINS, "CBOT", "wheat-srw"),
    _c("KE=F", "KC HRW Wheat", _GRAINS, "CBOT"),
    _c("ZS=F", "Soybeans", _GRAINS, "CBOT", "soybeans"),
    _c("ZM=F", "Soybean Meal", _GRAINS, "CBOT"),
    _c("ZL=F", "Soybean Oil", _GRAINS, "CBOT"),
    _c("KC=F", "Coffee", _SOFTS, "ICE US", "coffee"),
    _c("CC=F", "Cocoa", _SOFTS, "ICE US", "cocoa"),
    _c("SB=F", "Sugar No. 11", _SOFTS, "ICE US"),
    _c("CT=F", "Cotton No. 2", _SOFTS, "ICE US"),
    _c("OJ=F", "Orange Juice", _SOFTS, "ICE US"),
    _c("LBR=F", "Lumber", _SOFTS, "CME", "lumber"),
    _c("LE=F", "Live Cattle", _LIVESTOCK, "CME"),
    _c("GF=F", "Feeder Cattle", _LIVESTOCK, "CME"),
    _c("HE=F", "Lean Hogs", _LIVESTOCK, "CME"),
)

_BY_SYMBOL = {contract.symbol: contract for contract in FUTURES_CONTRACTS}
if len(_BY_SYMBOL) != len(FUTURES_CONTRACTS):
    raise ValueError("duplicate futures symbols in registry")


def normalize_futures_symbol(symbol: str) -> str:
    """Accept ``es``, ``ES`` or ``ES=F`` and return the registry form."""
    cleaned = symbol.strip().upper()
    return cleaned if cleaned.endswith("=F") else f"{cleaned}=F"


def contract_by_symbol(symbol: str) -> FuturesContract | None:
    return _BY_SYMBOL.get(normalize_futures_symbol(symbol))
