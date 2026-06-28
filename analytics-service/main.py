"""
Statistical Validation microservice (Module 15).

A stateless FastAPI compute service: it receives raw numeric arrays from the
Next.js backend and returns statistics. It holds no DB credentials and no
tenant context — the Node layer fetches/scopes the data, calls this service,
interprets, and persists the result. This keeps auth/tenancy in one place and
the Python service trivially testable and horizontally scalable.

Run:  uvicorn main:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI
from pydantic import BaseModel, Field
from scipy import stats
import numpy as np

app = FastAPI(title="Institutional Insights — Stats Service", version="1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


class Pair(BaseModel):
    x: list[float] = Field(..., min_length=3)
    y: list[float] = Field(..., min_length=3)


def _clean_pair(x: list[float], y: list[float]):
    a = np.array(x, dtype=float)
    b = np.array(y, dtype=float)
    mask = ~(np.isnan(a) | np.isnan(b))
    return a[mask], b[mask]


@app.post("/pearson")
def pearson(p: Pair):
    x, y = _clean_pair(p.x, p.y)
    if len(x) < 3:
        return {"error": "insufficient paired data"}
    r, pv = stats.pearsonr(x, y)
    return {"statistic": float(r), "pValue": float(pv), "sampleSize": int(len(x)), "effectSize": float(r)}


@app.post("/spearman")
def spearman(p: Pair):
    x, y = _clean_pair(p.x, p.y)
    if len(x) < 3:
        return {"error": "insufficient paired data"}
    rho, pv = stats.spearmanr(x, y)
    return {"statistic": float(rho), "pValue": float(pv), "sampleSize": int(len(x)), "effectSize": float(rho)}


class TwoGroups(BaseModel):
    groupA: list[float] = Field(..., min_length=2)
    groupB: list[float] = Field(..., min_length=2)


@app.post("/ttest")
def ttest(g: TwoGroups):
    a = np.array([v for v in g.groupA if v is not None], dtype=float)
    b = np.array([v for v in g.groupB if v is not None], dtype=float)
    a = a[~np.isnan(a)]
    b = b[~np.isnan(b)]
    if len(a) < 2 or len(b) < 2:
        return {"error": "each group needs at least 2 values"}
    # Welch's t-test (does not assume equal variance).
    t, pv = stats.ttest_ind(a, b, equal_var=False)
    # Cohen's d (pooled SD).
    pooled = np.sqrt(((len(a) - 1) * a.var(ddof=1) + (len(b) - 1) * b.var(ddof=1)) / (len(a) + len(b) - 2))
    d = float((a.mean() - b.mean()) / pooled) if pooled else 0.0
    return {
        "statistic": float(t), "pValue": float(pv),
        "sampleSize": int(len(a) + len(b)), "effectSize": d,
        "meanA": float(a.mean()), "meanB": float(b.mean()),
    }


class Groups(BaseModel):
    groups: list[list[float]] = Field(..., min_length=2)


@app.post("/anova")
def anova(g: Groups):
    cleaned = []
    for grp in g.groups:
        arr = np.array([v for v in grp if v is not None], dtype=float)
        arr = arr[~np.isnan(arr)]
        if len(arr) >= 2:
            cleaned.append(arr)
    if len(cleaned) < 2:
        return {"error": "need at least 2 groups with 2+ values"}
    f, pv = stats.f_oneway(*cleaned)
    n = int(sum(len(a) for a in cleaned))
    return {"statistic": float(f), "pValue": float(pv), "sampleSize": n, "groups": len(cleaned)}
