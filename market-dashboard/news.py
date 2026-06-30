"""News + sentiment aggregation for the market dashboard.

Pulls headlines from Google News RSS (free, no API key), scores each headline's
sentiment with VADER, and tags it by macro theme (geopolitics, inflation,
layoffs, AI) and rough sector. The output is a tidy DataFrame the UI can filter.

This surfaces information for your own research. It is not investment advice and
sentiment scores are a noisy, lexicon-based signal -- treat them as a rough
directional cue, not a prediction.
"""

from __future__ import annotations

import urllib.parse
from datetime import datetime, timezone

import feedparser
import pandas as pd
import streamlit as st
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


# Macro themes the user cares about, mapped to keyword triggers. Matching is
# case-insensitive substring matching against the headline text.
THEME_KEYWORDS: dict[str, list[str]] = {
    "Geopolitics / War": [
        "war", "conflict", "military", "sanction", "invasion", "geopolitic",
        "missile", "ceasefire", "troops", "border", "tariff", "trade war",
        "strike", "attack", "defense",
    ],
    "Inflation / Rates": [
        "inflation", "cpi", "ppi", "interest rate", "rate cut", "rate hike",
        "federal reserve", "fed ", "monetary", "yield", "prices rise",
        "cost of living", "consumer price",
    ],
    "Layoffs / Jobs": [
        "layoff", "job cut", "jobs cut", "restructur", "downsiz",
        "hiring freeze", "unemployment", "redundanc", "workforce reduction",
    ],
    "AI / Tech": [
        "artificial intelligence", " ai ", "ai-", "ai,", "machine learning",
        "chip", "gpu", "semiconductor", "llm", "generative", "data center",
        "datacenter", "openai", "nvidia",
    ],
}

# Rough sector tagging by keyword. Lightweight and approximate.
SECTOR_KEYWORDS: dict[str, list[str]] = {
    "Technology": ["tech", "software", "chip", "semiconductor", "ai", "cloud", "gpu"],
    "Energy": ["oil", "gas", "energy", "opec", "crude", "renewable", "solar"],
    "Financials": ["bank", "fed", "rate", "yield", "bond", "credit", "lending"],
    "Healthcare": ["pharma", "drug", "health", "biotech", "fda", "vaccine"],
    "Consumer": ["retail", "consumer", "spending", "sales", "auto", "housing"],
}


@st.cache_resource(show_spinner=False)
def _analyzer() -> SentimentIntensityAnalyzer:
    """One shared VADER analyzer (cheap to reuse, loads a lexicon once)."""
    return SentimentIntensityAnalyzer()


def _google_news_rss(query: str) -> str:
    """Build a Google News RSS search URL for the given query."""
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"


def classify_sentiment(compound: float) -> str:
    """Map a VADER compound score to a human label."""
    if compound >= 0.05:
        return "Positive"
    if compound <= -0.05:
        return "Negative"
    return "Neutral"


def tag_themes(text: str) -> list[str]:
    """Return the list of macro themes whose keywords appear in the text."""
    lower = text.lower()
    hits = [theme for theme, kws in THEME_KEYWORDS.items()
            if any(kw in lower for kw in kws)]
    return hits or ["Other"]


def tag_sector(text: str) -> str:
    """Return the first matching sector, or 'General' if none match."""
    lower = text.lower()
    for sector, kws in SECTOR_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            return sector
    return "General"


@st.cache_data(ttl=60 * 15, show_spinner=False)
def fetch_news(query: str, limit: int = 40) -> pd.DataFrame:
    """Fetch and enrich headlines for a single search query.

    Returns a DataFrame with columns: title, source, published, link, theme,
    sector, sentiment, score. Returns an empty DataFrame on failure.
    """
    feed = feedparser.parse(_google_news_rss(query))
    analyzer = _analyzer()

    rows = []
    for entry in feed.entries[:limit]:
        title = entry.get("title", "").strip()
        if not title:
            continue

        score = analyzer.polarity_scores(title)["compound"]
        published = entry.get("published_parsed")
        published_dt = (
            datetime(*published[:6], tzinfo=timezone.utc) if published else None
        )

        rows.append(
            {
                "title": title,
                "source": (entry.get("source", {}) or {}).get("title", "Unknown"),
                "published": published_dt,
                "link": entry.get("link", ""),
                "theme": ", ".join(tag_themes(title)),
                "sector": tag_sector(title),
                "sentiment": classify_sentiment(score),
                "score": round(score, 3),
                "query": query,
            }
        )

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values("published", ascending=False, na_position="last")
    return df


@st.cache_data(ttl=60 * 15, show_spinner=False)
def fetch_multi(queries: list[str], limit_per_query: int = 30) -> pd.DataFrame:
    """Fetch news for several queries and combine, de-duplicating by title."""
    frames = [fetch_news(q, limit_per_query) for q in queries]
    frames = [f for f in frames if not f.empty]
    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    combined = combined.drop_duplicates(subset="title")
    combined = combined.sort_values("published", ascending=False, na_position="last")
    return combined.reset_index(drop=True)
