"""
ML-based price prediction using historical price data.
Uses a Random Forest model to forecast future prices and detect trends.
"""

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

logger = logging.getLogger(__name__)


class PricePredictor:
    """Trains a Random Forest model on historical prices and predicts future values."""

    def __init__(self) -> None:
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer time-series features from raw price history.

        Parameters
        ----------
        df : pd.DataFrame
            Must contain ``price`` and ``scraped_at`` columns.

        Returns
        -------
        pd.DataFrame
            The input dataframe augmented with feature columns.
        """
        df = df.copy()
        df["scraped_at"] = pd.to_datetime(df["scraped_at"])
        df = df.sort_values("scraped_at").reset_index(drop=True)

        # Calendar features
        df["day_of_week"] = df["scraped_at"].dt.dayofweek
        df["day_of_month"] = df["scraped_at"].dt.day
        df["month"] = df["scraped_at"].dt.month

        # Days since the first observation
        start_date = df["scraped_at"].iloc[0]
        df["days_since_start"] = (df["scraped_at"] - start_date).dt.days

        # Rolling statistics
        df["rolling_avg_7"] = df["price"].rolling(window=7, min_periods=1).mean()
        df["rolling_avg_30"] = df["price"].rolling(window=30, min_periods=1).mean()
        df["price_std_7"] = df["price"].rolling(window=7, min_periods=1).std()

        # Fill any remaining NaN values produced by rolling calculations
        df["rolling_avg_7"] = df["rolling_avg_7"].fillna(df["price"])
        df["rolling_avg_30"] = df["rolling_avg_30"].fillna(df["price"])
        df["price_std_7"] = df["price_std_7"].fillna(0)

        return df

    def train_and_predict(self, df: pd.DataFrame, days_ahead: int = 7) -> dict:
        """Train on historical data and forecast ``days_ahead`` future prices.

        Parameters
        ----------
        df : pd.DataFrame
            Historical price data with ``price`` and ``scraped_at`` columns.
        days_ahead : int, optional
            Number of days to forecast (default ``7``).

        Returns
        -------
        dict
            Contains ``predictions``, ``confidence_score``, ``model_used``,
            ``trend``, and ``summary``.  If there are fewer than 15 data
            points, returns ``{"insufficient_data": True}``.
        """
        if len(df) < 15:
            return {"insufficient_data": True}

        try:
            df = self.prepare_features(df)

            feature_columns = [
                "day_of_week",
                "day_of_month",
                "month",
                "days_since_start",
                "rolling_avg_7",
                "rolling_avg_30",
                "price_std_7",
            ]

            X = df[feature_columns]
            y = df["price"]

            self.model.fit(X, y)

            # R² on training data (clamped to [0, 1])
            r2_score = self.model.score(X, y)
            confidence_score = round(float(np.clip(r2_score, 0.0, 1.0)), 4)

            # Build future feature rows
            last_row = df.iloc[-1]
            last_date = last_row["scraped_at"]
            last_days_since_start = int(last_row["days_since_start"])
            last_rolling_avg_7 = float(last_row["rolling_avg_7"])
            last_rolling_avg_30 = float(last_row["rolling_avg_30"])
            last_price_std_7 = float(last_row["price_std_7"])

            predictions: list[dict] = []

            for i in range(1, days_ahead + 1):
                future_date = last_date + timedelta(days=i)
                future_features = pd.DataFrame(
                    [
                        {
                            "day_of_week": future_date.dayofweek,
                            "day_of_month": future_date.day,
                            "month": future_date.month,
                            "days_since_start": last_days_since_start + i,
                            "rolling_avg_7": last_rolling_avg_7,
                            "rolling_avg_30": last_rolling_avg_30,
                            "price_std_7": last_price_std_7,
                        }
                    ]
                )

                predicted_price = float(self.model.predict(future_features)[0])
                predictions.append(
                    {
                        "date": future_date.strftime("%Y-%m-%d"),
                        "predicted_price": round(predicted_price, 2),
                    }
                )

            # Determine trend
            last_actual_price = float(df["price"].iloc[-1])
            last_predicted_price = predictions[-1]["predicted_price"]
            pct_change = (last_predicted_price - last_actual_price) / last_actual_price

            if pct_change < -0.02:
                trend = "drop"
            elif pct_change > 0.02:
                trend = "increase"
            else:
                trend = "stable"

            # Human-readable summary
            summary = (
                f"Based on {len(df)} historical data points, the model predicts "
                f"a {trend} trend over the next {days_ahead} days. "
                f"Current price: {last_actual_price:.2f}, "
                f"predicted price in {days_ahead} days: {last_predicted_price:.2f} "
                f"(confidence: {confidence_score:.0%})."
            )

            return {
                "predictions": predictions,
                "confidence_score": confidence_score,
                "model_used": "RandomForestRegressor",
                "trend": trend,
                "summary": summary,
            }

        except Exception:
            logger.exception("Price prediction failed")
            return {"error": "Prediction failed", "insufficient_data": False}
