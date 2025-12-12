# Sims 4 Lots Search (local)

This repo includes a tiny local website that loads `sims4_worlds_lots_full.csv` and lets you filter/search lots by **Lot Type** (plus World/Bucket and name search).

## Run

From this folder:

```bash
python serve.py
```

Then open:

`http://127.0.0.1:8000/`

## Files

- `index.html` – UI
- `app.js` – CSV loading + filters
- `styles.css` – styling
- `sims4_worlds_lots_full.csv` – data source
