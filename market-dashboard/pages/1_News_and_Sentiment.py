"""News & Sentiment page.

Aggregates market headlines, tags them by macro theme and sentiment, and lets
you filter and explore. Useful for getting a feel for the narrative around the
themes you care about -- geopolitics, inflation, layoffs, AI.

Not investment advice. Sentiment is a noisy lexicon-based signal.
"""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from news import THEME_KEYWORDS, fetch_multi


st.set_page_config(page_title="News & Sentiment", page_icon="news", layout="wide")

# Preset queries aligned to the macro themes, plus a broad market query.
PRESET_QUERIES = {
    "Overall market": "stock market",
    "Geopolitics / War": "geopolitical conflict war markets",
    "Inflation / Rates": "inflation federal reserve interest rates",
    "Layoffs / Jobs": "tech layoffs job cuts",
    "AI / Tech": "artificial intelligence stocks chips",
}

st.sidebar.header("News controls")

selected_presets = st.sidebar.multiselect(
    "Topics",
    list(PRESET_QUERIES.keys()),
    default=list(PRESET_QUERIES.keys()),
)

custom_query = st.sidebar.text_input(
    "Add a custom search (optional)",
    value="",
    help="e.g. a ticker or company name like 'NVDA earnings'",
)

per_query = st.sidebar.slider("Headlines per topic", 10, 50, 25, step=5)

queries = [PRESET_QUERIES[p] for p in selected_presets]
if custom_query.strip():
    queries.append(custom_query.strip())


st.title("News & Sentiment Aggregator")
st.caption(
    "Headlines tagged by theme and sentiment for your own research. "
    "Not investment advice -- sentiment is a rough, lexicon-based signal."
)

if not queries:
    st.info("Select at least one topic in the sidebar.")
    st.stop()

with st.spinner("Fetching and analyzing headlines..."):
    df = fetch_multi(queries, per_query)

if df.empty:
    st.error("No headlines returned. Try different topics or check your connection.")
    st.stop()


# ----------------------------------------------------------------------------
# Summary metrics
# ----------------------------------------------------------------------------
total = len(df)
pos = (df["sentiment"] == "Positive").sum()
neg = (df["sentiment"] == "Negative").sum()
neu = (df["sentiment"] == "Neutral").sum()
avg_score = df["score"].mean()

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Headlines", total)
c2.metric("Positive", pos)
c3.metric("Negative", neg)
c4.metric("Neutral", neu)
c5.metric("Avg sentiment", f"{avg_score:+.3f}")


# ----------------------------------------------------------------------------
# Charts: sentiment by theme
# ----------------------------------------------------------------------------
st.subheader("Sentiment by theme")

# Explode the comma-joined theme strings so a headline counts toward each theme.
exploded = df.assign(theme=df["theme"].str.split(", ")).explode("theme")

theme_summary = (
    exploded.groupby("theme")
    .agg(headlines=("title", "count"), avg_score=("score", "mean"))
    .reset_index()
    .sort_values("headlines", ascending=False)
)

col_a, col_b = st.columns(2)
with col_a:
    fig_count = px.bar(
        theme_summary, x="theme", y="headlines", title="Headline volume by theme"
    )
    fig_count.update_layout(height=360, margin=dict(l=10, r=10, t=40, b=10))
    st.plotly_chart(fig_count, use_container_width=True)

with col_b:
    fig_score = px.bar(
        theme_summary,
        x="theme",
        y="avg_score",
        title="Average sentiment by theme",
        color="avg_score",
        color_continuous_scale="RdYlGn",
        range_color=[-0.5, 0.5],
    )
    fig_score.update_layout(height=360, margin=dict(l=10, r=10, t=40, b=10))
    st.plotly_chart(fig_score, use_container_width=True)


# ----------------------------------------------------------------------------
# Filterable headline table
# ----------------------------------------------------------------------------
st.subheader("Headlines")

f1, f2 = st.columns(2)
theme_filter = f1.multiselect(
    "Filter by theme",
    sorted(exploded["theme"].unique()),
    default=[],
)
sentiment_filter = f2.multiselect(
    "Filter by sentiment",
    ["Positive", "Neutral", "Negative"],
    default=[],
)

view = df.copy()
if theme_filter:
    view = view[view["theme"].apply(lambda t: any(x in t for x in theme_filter))]
if sentiment_filter:
    view = view[view["sentiment"].isin(sentiment_filter)]

st.caption(f"Showing {len(view)} of {total} headlines")

display = view[["published", "title", "source", "theme", "sector", "sentiment", "score", "link"]]
st.dataframe(
    display,
    use_container_width=True,
    hide_index=True,
    column_config={
        "published": st.column_config.DatetimeColumn("Published", format="MMM D, HH:mm"),
        "title": st.column_config.TextColumn("Headline", width="large"),
        "link": st.column_config.LinkColumn("Link", display_text="open"),
        "score": st.column_config.NumberColumn("Score", format="%.3f"),
    },
)

st.download_button(
    "Download headlines (CSV)",
    data=view.to_csv(index=False).encode("utf-8"),
    file_name="news_sentiment.csv",
    mime="text/csv",
)
