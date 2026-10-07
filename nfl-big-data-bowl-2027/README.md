# ASTRA NFL HIDDEN TALENT Ω — NFL Big Data Bowl 2027

Goal: discover actionable, position-specific signals linking NFL Scouting Combine player movement to regular-season NFL tracking performance.

## Core hypothesis
Traditional Combine summaries compress movement into a few scalar outcomes. Tracking trajectories preserve *how* an athlete creates speed, brakes, redirects and re-accelerates. We test which movement fingerprints translate to NFL game movement and which prospects are systematically under/over-valued.

## Outputs
1. Combine Movement Fingerprint
2. Position-normalized Translation Score
3. Hidden Talent / Correctly Valued / Development Candidate / Bust Risk quadrants
4. Scout-facing player cards with interpretable drivers
5. Reproducible validation that separates cohorts/players to prevent leakage

## Evidence gate
PASS requires: official 2027 data loaded; schema validated; no player/cohort leakage; baseline beaten out-of-sample; stability by position/cohort; interpretable examples; public Kaggle notebook/writeup validated.
Until the official dataset is loaded and experiments run, model-performance status is UNVERIFIED.

## Zero-cost stack
Python, Polars/Pandas, NumPy, scikit-learn; optional LightGBM/XGBoost if available in Kaggle; matplotlib/Plotly for scout-facing visuals. Kaggle compute only by default.
