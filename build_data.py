import json
from pathlib import Path


def main() -> None:
    csv_path = Path("sims4_worlds_lots_full.csv")
    out_path = Path("data.js")

    text = csv_path.read_text(encoding="utf-8")
    payload = json.dumps(text)

    out_path.write_text(
        "/* Auto-generated from sims4_worlds_lots_full.csv. */\n"
        f"window.SIMS4_LOTS_CSV = {payload};\n",
        encoding="utf-8",
    )

    print(f"Wrote {out_path} from {csv_path} ({len(text)} chars)")


if __name__ == "__main__":
    main()
