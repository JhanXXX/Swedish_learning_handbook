"""Extract structured vocabulary and verb data from chapter Markdown files into JSON."""
import re
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
HANDBOOK = ROOT / "handbook"
OUT = ROOT / "app/src/data"
OUT.mkdir(parents=True, exist_ok=True)


def parse_md_table(lines):
    """Parse a GitHub-flavored markdown table into list of row dicts."""
    rows = []
    headers = None
    for line in lines:
        line = line.strip()
        if not line.startswith("|"):
            break
        cells = [c.strip() for c in line.strip("|").split("|")]
        if all(re.match(r"^-+$", c.replace(" ", "")) for c in cells if c):
            continue  # separator row
        if headers is None:
            # strip bold markers
            headers = [re.sub(r"\*\*(.+?)\*\*", r"\1", c) for c in cells]
        else:
            if len(cells) == len(headers):
                rows.append(dict(zip(headers, cells)))
    return rows


def clean(s):
    return re.sub(r"\*+", "", s).strip()


# ── Chapter 6: Nouns ──────────────────────────────────────────────────────────
def extract_nouns():
    text = (HANDBOOK / "chapter6.md").read_text()
    lines = text.splitlines()

    nouns = []
    current_section = ""
    i = 0
    while i < len(lines):
        line = lines[i]

        # Track section headers
        m = re.match(r"^## (6\.\d+)\s+(.+)", line)
        if m:
            current_section = clean(m.group(2))
            i += 1
            continue

        # Find vocab tables: rows where col 0 starts with "en " or "ett "
        if line.startswith("|") and i + 1 < len(lines):
            table_lines = []
            j = i
            while j < len(lines) and lines[j].startswith("|"):
                table_lines.append(lines[j])
                j += 1

            rows = parse_md_table(table_lines)
            for row in rows:
                vals = list(row.values())
                if not vals:
                    continue
                first = clean(vals[0])
                if first.startswith("en ") or first.startswith("ett "):
                    genus = "en" if first.startswith("en ") else "ett"
                    base = first[len(genus)+1:]
                    # expect: indef_sg | def_sg | indef_pl | def_pl | chinese | english
                    if len(vals) >= 6:
                        nouns.append({
                            "id": f"n_{len(nouns)}",
                            "category": current_section,
                            "genus": genus,
                            "indefinite_sg": clean(vals[0]),
                            "definite_sg": clean(vals[1]),
                            "indefinite_pl": clean(vals[2]),
                            "definite_pl": clean(vals[3]),
                            "zh": clean(vals[4]),
                            "en": clean(vals[5]),
                            "base": base,
                        })
            i = j
        else:
            i += 1

    return nouns


# ── Chapter 4: Verbs ──────────────────────────────────────────────────────────
def extract_verbs_ch4():
    text = (HANDBOOK / "chapter4.md").read_text()
    lines = text.splitlines()

    verbs = []
    current_section = ""
    i = 0
    while i < len(lines):
        line = lines[i]

        m = re.match(r"^###?\s+(.+)", line)
        if m:
            current_section = clean(m.group(1))
            i += 1
            continue

        if line.startswith("|") and i + 1 < len(lines):
            table_lines = []
            j = i
            while j < len(lines) and lines[j].startswith("|"):
                table_lines.append(lines[j])
                j += 1

            rows = parse_md_table(table_lines)
            for row in rows:
                vals = list(row.values())
                if len(vals) < 5:
                    continue
                infinitive = clean(vals[0])
                # skip if first col looks like a header or empty
                if not infinitive or infinitive in ("不定式", "动词") or len(infinitive) > 30:
                    continue
                # Must look like a Swedish verb (contains latin chars)
                if not re.search(r"[a-zA-ZåäöÅÄÖ]", infinitive):
                    continue
                verbs.append({
                    "id": f"v_{len(verbs)}",
                    "category": current_section,
                    "infinitive": infinitive,
                    "present": clean(vals[1]),
                    "past": clean(vals[2]),
                    "supinum": clean(vals[3]),
                    "zh": clean(vals[4]),
                    "group": clean(vals[5]) if len(vals) > 5 else "",
                })
            i = j
        else:
            i += 1

    return verbs


# ── Chapter 2: Core irregular verbs ──────────────────────────────────────────
def extract_verbs_ch2():
    text = (HANDBOOK / "chapter2.md").read_text()
    lines = text.splitlines()

    verbs = []
    in_irregular = False
    i = 0
    while i < len(lines):
        line = lines[i]

        if "核心不规则动词" in line or "2.7" in line:
            in_irregular = True

        if in_irregular and line.startswith("|"):
            table_lines = []
            j = i
            while j < len(lines) and lines[j].startswith("|"):
                table_lines.append(lines[j])
                j += 1

            rows = parse_md_table(table_lines)
            for row in rows:
                vals = list(row.values())
                if len(vals) < 4:
                    continue
                infinitive = clean(vals[0])
                if not infinitive or not re.search(r"[a-zA-ZåäöÅÄÖ]", infinitive):
                    continue
                verbs.append({
                    "id": f"irr_{len(verbs)}",
                    "category": "不规则动词",
                    "infinitive": infinitive,
                    "present": clean(vals[1]),
                    "past": clean(vals[2]),
                    "supinum": clean(vals[3]) if len(vals) > 3 else "",
                    "zh": clean(vals[4]) if len(vals) > 4 else "",
                    "group": "G4/不规则",
                })
            i = j
        else:
            i += 1

    return verbs


# ── Chapter 1: Pronouns ───────────────────────────────────────────────────────
def extract_pronouns():
    text = (HANDBOOK / "chapter1.md").read_text()
    lines = text.splitlines()

    pronouns = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("|"):
            table_lines = []
            j = i
            while j < len(lines) and lines[j].startswith("|"):
                table_lines.append(lines[j])
                j += 1
            rows = parse_md_table(table_lines)
            for row in rows:
                vals = list(row.values())
                if len(vals) >= 3:
                    zh = clean(vals[0])
                    sv = clean(vals[1])
                    en = clean(vals[2])
                    if sv and re.search(r"[a-zA-ZåäöÅÄÖ]", sv) and zh:
                        pronouns.append({"zh": zh, "sv": sv, "en": en})
            i = j
        else:
            i += 1
    # deduplicate
    seen = set()
    unique = []
    for p in pronouns:
        key = p["sv"]
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


# ── Chapter 3: Colors and adjectives ─────────────────────────────────────────
def extract_adjectives():
    text = (HANDBOOK / "chapter3.md").read_text()
    lines = text.splitlines()

    adjectives = []
    current_section = ""
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^##+ (.+)", line)
        if m:
            current_section = clean(m.group(1))
        if line.startswith("|"):
            table_lines = []
            j = i
            while j < len(lines) and lines[j].startswith("|"):
                table_lines.append(lines[j])
                j += 1
            rows = parse_md_table(table_lines)
            for row in rows:
                vals = list(row.values())
                if len(vals) >= 4:
                    sv = clean(vals[0])
                    # adjective tables usually: sv | en词形 | ett词形 | 英语 or sv | 意思
                    if sv and re.search(r"[a-zA-ZåäöÅÄÖ]", sv) and len(sv) < 20:
                        adjectives.append({
                            "category": current_section,
                            "sv": sv,
                            "en": clean(vals[-1]),
                            "zh": clean(vals[1]) if len(vals) > 1 else "",
                        })
            i = j
        else:
            i += 1
    return adjectives


# ── Build search index ────────────────────────────────────────────────────────
def build_search_index():
    index = []
    for chapter_num in range(1, 7):
        fname = HANDBOOK / f"chapter{chapter_num}.md"
        text = fname.read_text()
        sections = re.split(r"\n(#{1,3} .+)\n", text)
        current_heading = f"Chapter {chapter_num}"
        for part in sections:
            if re.match(r"#{1,3} .+", part):
                current_heading = clean(part.lstrip("#").strip())
            else:
                # Extract sentences/paragraphs
                paras = [p.strip() for p in part.split("\n\n") if p.strip() and not p.strip().startswith("|")]
                for para in paras[:3]:  # limit per section
                    clean_para = re.sub(r"\*+|`|>", "", para).strip()
                    if len(clean_para) > 20:
                        index.append({
                            "chapter": chapter_num,
                            "heading": current_heading,
                            "text": clean_para[:300],
                        })
    return index


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    nouns = extract_nouns()
    print(f"Nouns extracted: {len(nouns)}")
    (OUT / "nouns.json").write_text(json.dumps(nouns, ensure_ascii=False, indent=2))

    verbs_ch4 = extract_verbs_ch4()
    verbs_ch2 = extract_verbs_ch2()
    # merge, ch4 first then irregular
    all_verbs = verbs_ch4 + [v for v in verbs_ch2 if v["infinitive"] not in {x["infinitive"] for x in verbs_ch4}]
    print(f"Verbs extracted: {len(all_verbs)}")
    (OUT / "verbs.json").write_text(json.dumps(all_verbs, ensure_ascii=False, indent=2))

    pronouns = extract_pronouns()
    print(f"Pronouns extracted: {len(pronouns)}")
    (OUT / "pronouns.json").write_text(json.dumps(pronouns, ensure_ascii=False, indent=2))

    adjectives = extract_adjectives()
    print(f"Adjectives extracted: {len(adjectives)}")
    (OUT / "adjectives.json").write_text(json.dumps(adjectives, ensure_ascii=False, indent=2))

    search_index = build_search_index()
    print(f"Search index entries: {len(search_index)}")
    (OUT / "search_index.json").write_text(json.dumps(search_index, ensure_ascii=False, indent=2))

    print("Done. Files written to", OUT)
