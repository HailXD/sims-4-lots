import re
import csv
import requests

API = "https://sims.fandom.com/api.php"

WORLDS = [
    "Batuu","Brindleton Bay","Britechester","Chestnut Ridge","Ciudad Enamorada",
    "Copperdale","Del Sol Valley","Evergreen Harbor","Forgotten Hollow","Gibbi Point",
    "Glimmerbrook","Granite Falls","Henford-on-Bagley","Innisgreen","Magnolia Promenade",
    "Moonwood Mill","Mt. Komorebi","Newcrest","Nordhaven","Oasis Springs","Ravenwood",
    "San Myshuno","San Sequoia","Selvadorada","StrangerVille","Sulani","Tartosa",
    "Tomarang","Willow Creek","Windenburg"
]

def api_parse(page, prop, section=None):
    params = {
        "action": "parse",
        "page": page,
        "format": "json",
        "prop": prop,
    }
    if section is not None:
        params["section"] = section
    r = requests.get(API, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def get_pack_from_infobox_wikitext(page):
    # Pull lead wikitext and look for a "| game = [[The Sims 4: ...]]" line
    data = api_parse(page, prop="wikitext", section=0)
    wt = data.get("parse", {}).get("wikitext", {}).get("*", "")
    m = re.search(r"\|\s*game\s*=\s*\[\[(.*?)\]\]", wt)
    return m.group(1) if m else ""

def find_lots_section_index(page):
    data = api_parse(page, prop="sections")
    sections = data.get("parse", {}).get("sections", [])
    for s in sections:
        if s.get("line","").strip().lower() in ("lots", "lots[]"):
            return s.get("index")
    return None

def clean_wikilink(link_text):
    # Handles [[Page|Display]] or [[Display]]
    if "|" in link_text:
        return link_text.split("|", 1)[1].strip()
    return link_text.strip()

def parse_lots_from_wikitext(wikitext, pack, world):
    rows = []
    current_bucket = ""   # e.g., Residential Lots, Community Lots, Rental Lots, etc.

    for raw in wikitext.splitlines():
        line = raw.strip()

        # Headings (==, ===, ==== etc.)
        if re.match(r"^=+.*=+$", line):
            heading = re.sub(r"^=+|\[\]|\=+$", "", line).strip()
            if heading:
                current_bucket = heading
            continue

        # Bullet lines with lots
        if line.startswith("*"):
            # first [[...]] is usually the lot name
            links = re.findall(r"\[\[(.*?)\]\]", line)
            if not links:
                continue

            lot_name = clean_wikilink(links[0])

            # Try to find a " - [[Lot Type]]" style second link after dash
            lot_type = ""
            dash_split = line.split(" - ", 1)
            if len(dash_split) == 2:
                after = dash_split[1]
                links_after = re.findall(r"\[\[(.*?)\]\]", after)
                if links_after:
                    lot_type = clean_wikilink(links_after[0])

            # If not explicit, infer from bucket
            if not lot_type:
                b = current_bucket.lower()
                if "community" in b:
                    lot_type = "Community lot"
                elif "apartment" in b:
                    lot_type = "Apartment"
                elif "penthouse" in b:
                    lot_type = "Penthouse"
                elif "rental" in b and "vacation" in b:
                    lot_type = "Vacation Rental"
                elif "rental" in b:
                    lot_type = "Rental"
                elif "special" in b:
                    lot_type = "Special lot"
                elif "empty" in b:
                    lot_type = "Empty lot"
                else:
                    lot_type = "Residential"

            rows.append({
                "World": world,
                "Pack/DLC": pack,
                "Lot Name": lot_name,
                "Lot Type": lot_type,
                "Bucket/Section": current_bucket
            })
    return rows

all_rows = []

for world in WORLDS:
    sec = find_lots_section_index(world)
    pack = get_pack_from_infobox_wikitext(world)
    if not pack:
        pack = "(Pack not found via infobox parse)"

    if sec is None:
        # Some pages are structured differently; you can special-case them here
        continue

    data = api_parse(world, prop="wikitext", section=sec)
    wt = data.get("parse", {}).get("wikitext", {}).get("*", "")
    all_rows.extend(parse_lots_from_wikitext(wt, pack, world))

with open("sims4_worlds_lots_full.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["World","Pack/DLC","Lot Name","Lot Type","Bucket/Section"]
    )
    writer.writeheader()
    writer.writerows(all_rows)

print(f"Wrote {len(all_rows)} rows to sims4_worlds_lots_full.csv")
