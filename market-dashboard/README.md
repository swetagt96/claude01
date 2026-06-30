# Market Data Dashboard

A Streamlit dashboard for exploring historical stock performance. It charts
prices over any time window, compares multiple stocks on a normalized basis,
and surfaces key risk/return metrics — so you can do your own analysis with
transparent, inspectable data.

> **Disclaimer:** This is an analysis tool, not investment advice. It does not
> recommend stocks or predict prices. Past performance does not indicate future
> results. Do your own research and consult a licensed financial advisor before
> making investment decisions.

## Features

- **Price charts** over selectable windows (30/60/90 days, 6mo, 1yr, 3yr).
- **Normalized comparison** — rebase every stock to 100 to compare percentage
  performance regardless of share price.
- **Key metrics** — total return, annualized return, annualized volatility,
  Sharpe ratio (rf=0), and max drawdown.
- **Fundamentals snapshot** — market cap, P/E, dividend yield, 52-week range.
- **CSV export** of the underlying price data.

Data comes from [Yahoo Finance](https://finance.yahoo.com/) via the free
`yfinance` library — no API key required.

## Setup

```bash
cd market-dashboard
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
streamlit run app.py
```

Then open the URL Streamlit prints (default http://localhost:8501).

## Usage tips

- Enter tickers comma-separated in the sidebar, e.g. `AAPL, MSFT, NVDA`.
- Use Yahoo Finance symbols for indices, e.g. `^GSPC` (S&P 500),
  `^IXIC` (Nasdaq), `^DJI` (Dow).
- Switch between **Normalized** (percentage comparison) and **Raw price** views.

## Project structure

```
market-dashboard/
├── app.py            # Streamlit UI
├── data.py           # yfinance data access + metric calculations
├── requirements.txt
└── README.md
```
