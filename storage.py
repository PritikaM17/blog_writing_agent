import json
import re
from datetime import datetime
from pathlib import Path

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

SLUG_RE = re.compile(r"[a-z0-9-]+$")

def slugify(text: str) -> str:
    """'10 Best Tips: 2026!' -> '10-best-tips-2026'"""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:80] or "blog"

def _unique_slug(base: str) -> str:
    """Don't overwrite: if 'cold-brew' exists, use 'cold-brew-2'."""
    slug, n = base, 2
    while (OUTPUTS_DIR / f"{slug}.md").exists():
        slug = f"{base}-{n}"
        n += 1
    return slug

def save_blog(topic, title, markdown, mode, images, evidence) -> dict:
    slug = _unique_slug(slugify(title))
    meta = {
        "slug": slug,
        "title": title,
        "topic": topic,
        "mode": mode,
        "images": images,
        "evidence": evidence,
        "created_at": datetime.now().isoformat(timespec="seconds")
    }

    (OUTPUTS_DIR / f"{slug}.md").write_text(markdown, encoding="utf-8")
    (OUTPUTS_DIR / f"{slug}.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    return {**meta, "markdown": markdown}

def list_blogs() -> list[dict]:
    blogs = [json.loads(f.read_text(encoding='utf-8')) for f in OUTPUTS_DIR.glob('*.json')]
    return sorted(blogs, key=lambda b: b['created_at'], reverse=True)

def get_blog(slug: str) -> dict | None:
    if not SLUG_RE.match(slug):
        return None
    md_path = OUTPUTS_DIR / f"{slug}.md"
    meta_path = OUTPUTS_DIR / f"{slug}.json"

    if not md_path.exists() or not meta_path.exists():
        return None
    
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    return {**meta, "markdown": md_path.read_text(encoding='utf-8')}

