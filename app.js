const CSV_PATH = "sims4_worlds_lots_full.csv";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") continue;

    field += ch;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function normalize(s) {
  return (s ?? "").toString().trim();
}

function reconcileHeaders(rawHeaders, firstDataRow) {
  const headers = rawHeaders.map((h) => normalize(h));
  const dataLen = firstDataRow.length;

  if (headers.length === dataLen) return headers;

  if (headers.length === dataLen + 1 && headers.includes("Pack/DLC")) {
    return headers.filter((h) => h !== "Pack/DLC");
  }

  if (dataLen === 4) return ["World", "Lot Name", "Lot Type", "Bucket/Section"];
  if (dataLen === 5) return ["World", "Pack/DLC", "Lot Name", "Lot Type", "Bucket/Section"];

  return Array.from({ length: dataLen }, (_, i) => `Column ${i + 1}`);
}

function buildIndex(headers) {
  const index = Object.create(null);
  for (let i = 0; i < headers.length; i++) index[headers[i]] = i;
  return index;
}

function option(label, value) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  return opt;
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter((v) => normalize(v) !== ""))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function setOptions(select, values, allLabel = "All") {
  select.innerHTML = "";
  select.appendChild(option(allLabel, ""));
  for (const v of values) select.appendChild(option(v, v));
}

function byWorldThenName(a, b) {
  const w = a.world.localeCompare(b.world);
  if (w !== 0) return w;
  return a.lotName.localeCompare(b.lotName);
}

function escapeText(s) {
  return (s ?? "").toString();
}

function main() {
  const els = {
    lotType: document.getElementById("lotType"),
    world: document.getElementById("world"),
    bucket: document.getElementById("bucket"),
    query: document.getElementById("query"),
    reset: document.getElementById("reset"),
    statusText: document.getElementById("statusText"),
    resultsBody: document.getElementById("resultsBody"),
    packHeader: document.getElementById("packHeader"),
  };

  let allLots = [];
  let hasPack = false;

  function render() {
    const lotType = normalize(els.lotType.value);
    const world = normalize(els.world.value);
    const bucket = normalize(els.bucket.value);
    const q = normalize(els.query.value).toLowerCase();

    const filtered = allLots
      .filter((r) => (lotType ? r.lotType === lotType : true))
      .filter((r) => (world ? r.world === world : true))
      .filter((r) => (bucket ? r.bucket === bucket : true))
      .filter((r) => (q ? r.lotName.toLowerCase().includes(q) : true))
      .sort(byWorldThenName);

    els.statusText.textContent = `Showing ${filtered.length} of ${allLots.length} lots`;

    els.resultsBody.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const r of filtered) {
      const tr = document.createElement("tr");

      const tdWorld = document.createElement("td");
      tdWorld.textContent = escapeText(r.world);
      tr.appendChild(tdWorld);

      const tdName = document.createElement("td");
      tdName.textContent = escapeText(r.lotName);
      tr.appendChild(tdName);

      const tdType = document.createElement("td");
      tdType.textContent = escapeText(r.lotType);
      tr.appendChild(tdType);

      const tdBucket = document.createElement("td");
      tdBucket.textContent = escapeText(r.bucket);
      tr.appendChild(tdBucket);

      if (hasPack) {
        const tdPack = document.createElement("td");
        tdPack.textContent = escapeText(r.pack);
        tr.appendChild(tdPack);
      }

      frag.appendChild(tr);
    }
    els.resultsBody.appendChild(frag);
  }

  function wireControls() {
    els.lotType.addEventListener("change", render);
    els.world.addEventListener("change", render);
    els.bucket.addEventListener("change", render);
    els.query.addEventListener("input", render);
    els.reset.addEventListener("click", () => {
      els.lotType.value = "";
      els.world.value = "";
      els.bucket.value = "";
      els.query.value = "";
      render();
      els.query.focus();
    });
  }

  async function load() {
    wireControls();
    try {
      const res = await fetch(CSV_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load CSV: ${res.status} ${res.statusText}`);
      const text = await res.text();

      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV has no data rows");

      const headers = reconcileHeaders(rows[0], rows[1]);
      const index = buildIndex(headers);

      const idxWorld = index["World"];
      const idxPack = index["Pack/DLC"];
      const idxLotName = index["Lot Name"];
      const idxLotType = index["Lot Type"];
      const idxBucket = index["Bucket/Section"];

      allLots = rows.slice(1).map((r) => {
        const world = normalize(r[idxWorld] ?? "");
        const pack = idxPack === undefined ? "" : normalize(r[idxPack] ?? "");
        const lotName = normalize(r[idxLotName] ?? "");
        const lotType = normalize(r[idxLotType] ?? "");
        const bucket = normalize(r[idxBucket] ?? "");
        return { world, pack, lotName, lotType, bucket };
      });

      hasPack = allLots.some((r) => normalize(r.pack) !== "");
      if (hasPack) els.packHeader.classList.remove("hidden");

      setOptions(els.lotType, uniqueSorted(allLots.map((r) => r.lotType)));
      setOptions(els.world, uniqueSorted(allLots.map((r) => r.world)));
      setOptions(els.bucket, uniqueSorted(allLots.map((r) => r.bucket)));

      render();
    } catch (e) {
      els.statusText.textContent = `${e}`;
    }
  }

  load();
}

document.addEventListener("DOMContentLoaded", main);
