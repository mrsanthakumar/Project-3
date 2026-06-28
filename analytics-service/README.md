# Statistical Validation Service (Module 15)

Stateless FastAPI + SciPy microservice. The Next.js backend fetches and scopes
the data, calls this service with raw arrays, then interprets and persists the
result into `statistical_reports`. No DB access lives here.

## Endpoints
| POST | Body | Returns |
|---|---|---|
| `/pearson` | `{x:[], y:[]}` | r, pValue, sampleSize, effectSize |
| `/spearman` | `{x:[], y:[]}` | rho, pValue, sampleSize, effectSize |
| `/ttest` | `{groupA:[], groupB:[]}` | Welch t, pValue, Cohen's d, group means |
| `/anova` | `{groups:[[],[],…]}` | F, pValue, sampleSize, groups |
| `/health` | — | `{status:"ok"}` |

## Run
```bash
cd analytics-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Set `ANALYTICS_URL=http://localhost:8000` in the Next.js `.env`.

scikit-learn / pandas are bundled now for the predictive-model work that can
extend this service later; the current endpoints use SciPy only.
