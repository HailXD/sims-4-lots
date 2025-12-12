# Sims 4 Lots Search (local)

This repo includes a tiny local website that loads `sims4_worlds_lots_full.csv` and lets you filter/search lots by **Lot Type** (plus World/Bucket and name search).

## Run (no server needed)

Just open `index.html` (double-click it).

If you change `sims4_worlds_lots_full.csv`, regenerate `data.js`:

```bash
python build_data.py
```

## Optional local server

If you prefer serving over HTTP:

```bash
python serve.py
```

Open `http://127.0.0.1:8000/`.

## Files

- `index.html` – UI
- `app.js` – CSV loading + filters
- `styles.css` – styling
- `sims4_worlds_lots_full.csv` – data source
