"""
Adds `fr` and `de` fields to nouns.json and verbs.json via the MyMemory free translation API.
- Nouns: translates from English (en field)
- Verbs: translates from Chinese (zh field)
Skips entries that already have both fields. Saves progress incrementally.
"""
import json, time, urllib.request, urllib.parse, sys
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "app" / "src" / "data"
DELAY = 0.35  # seconds between requests to respect rate limits


def translate(text: str, lang_pair: str) -> str | None:
    """Call MyMemory API. Returns translated string or None on failure."""
    url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode({
        "q": text,
        "langpair": lang_pair,
    })
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
        if data.get("responseStatus") == 200:
            return data["responseData"]["translatedText"]
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
    return None


def process_file(path: Path, src_field: str, src_lang: str):
    entries = json.loads(path.read_text())
    total = len(entries)
    changed = 0

    for i, entry in enumerate(entries):
        need_fr = not entry.get("fr")
        need_de = not entry.get("de")
        if not need_fr and not need_de:
            continue

        src = entry.get(src_field, "").strip()
        if not src:
            continue

        tag = entry.get("id", str(i))
        print(f"[{i+1}/{total}] {tag}: {src!r}", end="  ", flush=True)

        if need_fr:
            fr = translate(src, f"{src_lang}|fr")
            if fr:
                entry["fr"] = fr
                print(f"fr={fr!r}", end="  ", flush=True)
            time.sleep(DELAY)

        if need_de:
            de = translate(src, f"{src_lang}|de")
            if de:
                entry["de"] = de
                print(f"de={de!r}", end="  ", flush=True)
            time.sleep(DELAY)

        print()
        changed += 1

        # Incremental save every 10 entries
        if changed % 10 == 0:
            path.write_text(json.dumps(entries, ensure_ascii=False, indent=2))
            print(f"  [saved progress: {changed} entries updated]")

    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2))
    print(f"\nDone: {changed} entries updated in {path.name}")


if __name__ == "__main__":
    print("=== Nouns (en → fr, de) ===")
    process_file(DATA_DIR / "nouns.json", src_field="en", src_lang="en")

    print("\n=== Verbs (zh → fr, de) ===")
    process_file(DATA_DIR / "verbs.json", src_field="zh", src_lang="zh")
