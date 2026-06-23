"""Data access layer for the market dashboard.

All network access goes through yfinance (free, no API key required).
Functions are cached with Streamlit's cache so repeated UI interactions
don't hammer the network.
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd
import streamlit as st
import yfinance as yf


# Trading days per year, used to annualize volatility / return figures.
TRADING_DAYS = 252


@st.cache_data(ttl=60 * 30, show_spinner=False)
def fetch_prices(tickers: list[str], start: date, end: date) -> pd.DataFrame:
    """Return a DataFrame of adjusted close prices, one column per ticker.

    Missing tickers are silently dropped. The index is a DatetimeIndex.
    """
    if not tickers:
        return pd.DataFrame()

    # auto_adjust=True gives split/dividend-adjusted closes in "Close".
    raw = yf.download(
        tickers=tickers,
        start=start,
        end=end + timedelta(days=1),  # yf end is exclusive
        auto_adjust=True,
        progress=False,
        group_by="column",
    )

    if raw.empty:
        return pd.DataFrame()

    # Single ticker -> flat columns; multi ticker -> MultiIndex columns.
    if isinstance(raw.columns, pd.MultiIndex):
        close = raw["Close"].copy()
    else:
        close = raw[["Close"]].copy()
        close.columns = [tickers[0]]

    close = close.dropna(how="all")
    return close


@st.cache_data(ttl=60 * 30, show_spinner=False)
def fetch_info(ticker: str) -> dict:
    """Return a dict of fundamental/company info for a single ticker.

    Returns an empty dict on any failure so the UI can degrade gracefully.
    """
    try:
        return yf.Ticker(ticker).info or {}
    except Exception:
        return {}


def normalize(prices: pd.DataFrame) -> pd.DataFrame:
    """Rebase every series to 100 at the first valid observation.

    This makes performance comparable across stocks with different price levels.
    """
    if prices.empty:
        return prices
    return prices.divide(prices.iloc[0]).multiply(100)


def compute_metrics(prices: pd.DataFrame) -> pd.DataFrame:
    """Compute summary performance metrics for each ticker column."""
    if prices.empty:
        return pd.DataFrame()

    rows = []
    for col in prices.columns:
        series = prices[col].dropna()
        if len(series) < 2:
            continue

        daily_returns = series.pct_change().dropna()
        total_return = series.iloc[-1] / series.iloc[0] - 1
        ann_vol = daily_returns.std() * np.sqrt(TRADING_DAYS)
        ann_return = (1 + daily_returns.mean()) ** TRADING_DAYS - 1
        sharpe = ann_return / ann_vol if ann_vol else np.nan

        # Max drawdown: largest peak-to-trough decline.
        running_max = series.cummax()
        drawdown = series / running_max - 1
        max_drawdown = drawdown.min()

        rows.append(
            {
                "Ticker": col,
                "Last Price": round(series.iloc[-1], 2),
                "Total Return": total_return,
                "Annualized Return": ann_return,
                "Annualized Volatility": ann_vol,
                "Sharpe (rf=0)": round(sharpe, 2) if pd.notna(sharpe) else np.nan,
                "Max Drawdown": max_drawdown,
            }
        )

    return pd.DataFrame(rows).set_index("Ticker")
