"""
Production ML Components for Beeline VoyageRail Omni-Apex Engine.
Provides production implementations of Hierarchical Empirical Bayes (HEB)
and DriftPurgedTwoStepCalibrator for fast in-process execution (< 2.0ms).
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.special import expit
from sklearn.isotonic import IsotonicRegression


class HierarchicalEmpiricalBayesTargetEncoder:
    """
    3-Level Hierarchical Empirical Bayes Target Encoding:
      Level 0: Global target mean mu_0
      Level 1: corridor_slug, credibility lambda_1 = n_1 / (n_1 + m2) towards mu_0
      Level 2: (corridor_slug, train_category), credibility lambda_2 = n_2 / (n_2 + m2) towards Level 1
      Level 3: train_number, credibility lambda_3 = n_3 / (n_3 + m1) towards Level 2
    Where m1 = 50.0, m2 = 30.0.
    """
    def __init__(self, m1: float = 50.0, m2: float = 30.0) -> None:
        self.m1 = float(m1)
        self.m2 = float(m2)
        self.global_mean: float = 0.0
        self.level1_stats: Dict[str, float] = {}
        self.level2_stats: Dict[str, float] = {}
        self.level3_stats: Dict[str, float] = {}

    def fit(self, df: pd.DataFrame, target: pd.Series) -> "HierarchicalEmpiricalBayesTargetEncoder":
        y = target.to_numpy(dtype=np.float64)
        self.global_mean = float(np.mean(y))

        corridor = df["corridor_slug"].astype(str).values
        category = df["train_category"].astype(str).values
        train_num = df["train_number"].astype(str).values
        pair_key = (df["corridor_slug"].astype(str) + "__" + category).values

        # Level 1: corridor_slug
        df_l1 = pd.DataFrame({"key": corridor, "y": y})
        g1 = df_l1.groupby("key")["y"].agg(["count", "mean"])
        n1 = g1["count"].values
        mean1 = g1["mean"].values
        cred1 = n1 / (n1 + self.m2)
        post1 = cred1 * mean1 + (1.0 - cred1) * self.global_mean
        self.level1_stats = {str(k): float(v) for k, v in zip(g1.index.values, post1)}

        # Level 2: (corridor_slug, train_category)
        df_l2 = pd.DataFrame({"key": pair_key, "corr": corridor, "y": y})
        g2 = df_l2.groupby(["key", "corr"])["y"].agg(["count", "mean"]).reset_index()
        priors_l2 = np.array([self.level1_stats.get(c, self.global_mean) for c in g2["corr"].values])
        n2 = g2["count"].values
        mean2 = g2["mean"].values
        cred2 = n2 / (n2 + self.m2)
        post2 = cred2 * mean2 + (1.0 - cred2) * priors_l2
        self.level2_stats = {str(k): float(v) for k, v in zip(g2["key"].values, post2)}

        # Level 3: train_number
        df_l3 = pd.DataFrame({"train": train_num, "pair": pair_key, "y": y})
        g3 = df_l3.groupby(["train", "pair"])["y"].agg(["count", "mean"]).reset_index()
        priors_l3 = np.array([self.level2_stats.get(p, self.global_mean) for p in g3["pair"].values])
        n3 = g3["count"].values
        mean3 = g3["mean"].values
        cred3 = n3 / (n3 + self.m1)
        post3 = cred3 * mean3 + (1.0 - cred3) * priors_l3
        self.level3_stats = {str(k): float(v) for k, v in zip(g3["train"].values, post3)}

        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        corridor = df["corridor_slug"].astype(str).values
        category = df["train_category"].astype(str).values
        train_num = df["train_number"].astype(str).values
        pair_key = (df["corridor_slug"].astype(str) + "__" + category).values

        n = len(df)
        out = np.empty(n, dtype=np.float32)

        for i in range(n):
            t = train_num[i]
            if t in self.level3_stats:
                out[i] = self.level3_stats[t]
            else:
                pk = pair_key[i]
                if pk in self.level2_stats:
                    out[i] = self.level2_stats[pk]
                else:
                    c = corridor[i]
                    out[i] = self.level1_stats.get(c, self.global_mean)

        return out

    def lookup(self, train_number: Any, corridor_slug: Any, train_category: Any) -> float:
        """Fast scalar lookup in < 100ns."""
        t_str = str(train_number).strip()
        if t_str and t_str in self.level3_stats:
            return self.level3_stats[t_str]
        pk = f"{corridor_slug}__{train_category}"
        if pk in self.level2_stats:
            return self.level2_stats[pk]
        c_str = str(corridor_slug).strip()
        return self.level1_stats.get(c_str, self.global_mean)


class DriftPurgedTwoStepCalibrator:
    """
    Purged Two-Step Calibrator:
      Step 1: Logit Temperature Scaling with L2 Prior:
              p_T = sigmoid(logit(p) / T) where T is anchored to T=1.01.
      Step 2: L2-Anchored Isotonic Blend:
              p_cal = iso_weight * p_iso + (1 - iso_weight) * p_T
    """
    def __init__(
        self,
        eps: float = 1e-5,
        l2_t: float = 20.0,
        anchor_weight: float = 250.0,
        iso_weight: float = 0.15,
        temperature: float = 1.010,
    ) -> None:
        self.eps = eps
        self.l2_t = l2_t
        self.anchor_weight = anchor_weight
        self.iso_weight = iso_weight
        self.temperature: float = float(temperature)
        self.isotonic = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)

    def fit(self, prob_raw: np.ndarray, y_true: np.ndarray) -> "DriftPurgedTwoStepCalibrator":
        p_c = np.clip(prob_raw, self.eps, 1.0 - self.eps)
        logits = np.log(p_c / (1.0 - p_c))

        # 1. Optimize temperature T with L2 penalty to anchor at 1.01
        def obj(T: np.ndarray) -> float:
            T_val = max(0.5, min(2.0, float(T[0])))
            p_t = expit(logits / T_val)
            p_t = np.clip(p_t, 1e-7, 1.0 - 1e-7)
            nll = -float(np.mean(y_true * np.log(p_t) + (1.0 - y_true) * np.log(1.0 - p_t)))
            reg = self.l2_t * (T_val - 1.01) ** 2
            return nll + reg

        res = minimize(obj, [1.01], method="Nelder-Mead", options={"maxiter": 50})
        self.temperature = max(0.8, min(1.2, float(res.x[0])))

        # 2. Fit L2-Anchored Isotonic on temperature scaled probabilities
        p_temp = expit(logits / self.temperature)
        grid = np.linspace(0.0, 1.0, 200)
        p_combined = np.concatenate([p_temp, grid])
        y_combined = np.concatenate([y_true.astype(np.float64), grid])
        weights = np.concatenate([
            np.ones(len(p_temp)),
            np.full(len(grid), self.anchor_weight * len(p_temp) / len(grid)),
        ])
        self.isotonic.fit(p_combined, y_combined, sample_weight=weights)

        return self

    def predict(self, prob_raw: Union[np.ndarray, float]) -> Union[np.ndarray, float]:
        is_scalar = np.isscalar(prob_raw)
        p_arr = np.atleast_1d(np.asarray(prob_raw, dtype=np.float32))
        p_c = np.clip(p_arr, self.eps, 1.0 - self.eps)
        logits = np.log(p_c / (1.0 - p_c))
        p_temp = expit(logits / self.temperature)
        p_iso = self.isotonic.predict(p_temp)
        p_cal = self.iso_weight * p_iso + (1.0 - self.iso_weight) * p_temp
        result = np.clip(p_cal, 0.0, 1.0).astype(np.float32)
        if is_scalar:
            return float(result[0])
        return result

    def transform(self, prob_raw: Union[np.ndarray, float]) -> Union[np.ndarray, float]:
        """Alias to predict() for scikit-learn transformer compatibility."""
        return self.predict(prob_raw)
