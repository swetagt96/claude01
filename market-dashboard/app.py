"""Market Data Dashboard.

A Streamlit app for exploring historical stock performance: price charts over
any window, normalized multi-stock comparison, and key risk/return metrics.

This is an analysis tool. It does not provide investment advice or
recommendations -- it surfaces transparent data so you can form your own view.

Run with:
    streamlit run app.py
"""

from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from data import compute_metrics, fetch_info, fetch_prices, normalize


st.set_page_config(page_title="Market Data Dashboard", page_icon="chart", layout="wide")

DEFAULT_TICKERS = "AAPL, MSFT, NVDA"
PERIOD_PRESETS = {
    "Last 30 days": 30,
    "Last 60 days": 60,
    "Last 90 days": 90,
    "Last 6 months": 182,
    "Last 1 year": 365,
    "Last 3 years": 365 * 3,
}


def parse_tickers(raw: str) -> list[str]:
    """Split a comma/space separated string into a clean list of upper-case tickers."""
    parts = [p.strip().upper() for p in raw.replace(",", " ").split()]
    # Preserve order while removing duplicates.
    seen: dict[str, None] = {}
    for p in parts:
        if p:
            seen.setdefault(p, None)
    return list(seen.keys())


# ----------------------------------------------------------------------------
# Sidebar controls
# ----------------------------------------------------------------------------
st.sidebar.header("Controls")

ticker_input = st.sidebar.text_input(
    "Tickers (comma separated)",
    value=DEFAULT_TICKERS,
    help="e.g. AAPL, MSFT, NVDA, ^GSPC (S&P 500 index)",
)

period_label = st.sidebar.selectbox(
    "Time window", list(PERIOD_PRESETS.keys()), index=2  # default: Last 90 days
)

chart_mode = st.sidebar.radio(
    "Chart mode",
    ["Normalized (rebased to 100)", "Raw price"],
    help="Normalized lets you compare percentage performance across stocks.",
)

tickers = parse_tickers(ticker_input)
end_date = date.today()
start_date = end_date - timedelta(days=PERIOD_PRESETS[period_label])


# ----------------------------------------------------------------------------
# Main view
# ----------------------------------------------------------------------------
st.title("Market Data Dashboard")
st.caption(
    "Historical price analysis tool. Not investment advice -- "
    "data is for your own research."
)

if not tickers:
    st.info("Enter one or more tickers in the sidebar to get started.")
    st.stop()

with st.spinner("Fetching market data..."):
    prices = fetch_prices(tickers, start_date, end_date)

if prices.empty:
    st.error(
        "No data returned. Check the ticker symbols (use Yahoo Finance symbols, "
        "e.g. `^GSPC` for the S&P 500) and try again."
    )
    st.stop()

found = list(prices.columns)
missing = [t for t in tickers if t not in found]
if missing:
    st.warning(f"No data for: {', '.join(missing)}")

st.subheader(f"Performance: {period_label.lower()}")

# Build the price chart.
plot_df = normalize(prices) if chart_mode.startswith("Normalized") else prices
fig = go.Figure()
for col in plot_df.columns:
    fig.add_trace(go.Scatter(x=plot_df.index, y=plot_df[col], mode="lines", name=col))
y_title = "Indexed to 100" if chart_mode.startswith("Normalized") else "Price"
fig.update_layout(
    height=480,
    margin=dict(l=10, r=10, t=30, b=10),
    yaxis_title=y_title,
    xaxis_title="Date",
    legend_title="Ticker",
    hovermode="x unified",
)
st.plotly_chart(fig, use_container_width=True)


# ----------------------------------------------------------------------------
# Metrics table
# ----------------------------------------------------------------------------
st.subheader("Key metrics")
metrics = compute_metrics(prices)
if not metrics.empty:
    styled = metrics.style.format(
        {
            "Total Return": "{:.2%}",
            "Annualized Return": "{:.2%}",
            "Annualized Volatility": "{:.2%}",
            "Max Drawdown": "{:.2%}",
            "Last Price": "{:.2f}",
        }
    )
    st.dataframe(styled, use_container_width=True)
    st.caption(
        "Sharpe assumes a 0% risk-free rate. Annualized figures use 252 trading days. "
        "Past performance does not predict future results."
    )


# ----------------------------------------------------------------------------
# Fundamentals (per ticker)
# ----------------------------------------------------------------------------
st.subheader("Fundamentals snapshot")
fund_rows = []
for t in found:
    info = fetch_info(t)
    if not info:
        continue
    fund_rows.append(
        {
            "Ticker": t,
            "Name": info.get("shortName"),
            "Sector": info.get("sector"),
            "Market Cap": info.get("marketCap"),
            "Trailing P/E": info.get("trailingPE"),
            "Forward P/E": info.get("forwardPE"),
            "Div Yield": info.get("dividendYield"),
            "52w High": info.get("fiftyTwoWeekHigh"),
            "52w Low": info.get("fiftyTwoWeekLow"),
        }
    )

if fund_rows:
    fund_df = pd.DataFrame(fund_rows).set_index("Ticker")
    st.dataframe(fund_df, use_container_width=True)
else:
    st.caption("Fundamentals unavailable for the selected tickers.")


# ----------------------------------------------------------------------------
# Download
# ----------------------------------------------------------------------------
st.download_button(
    "Download price data (CSV)",
    data=prices.to_csv().encode("utf-8"),
    file_name="prices.csv",
    mime="text/csv",
)
