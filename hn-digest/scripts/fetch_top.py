#!/usr/bin/env python3
"""Fetch HN top stories and print a digest.json stub (English fields only).

Japanese titles/summaries are curated separately in data/digest.json.
"""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone

TOP_N = 20
API = "https://hacker-news.firebaseio.com/v0"


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as res:
        return json.load(res)


def main() -> None:
    ids = get_json(f"{API}/topstories.json")[:TOP_N]
    stories = []
    for rank, item_id in enumerate(ids, start=1):
        item = get_json(f"{API}/item/{item_id}.json")
        if not item or item.get("type") == "job":
            continue
        stories.append(
            {
                "id": item["id"],
                "rank": rank,
                "titleJa": "",
                "summaryJa": "",
                "title": item.get("title", ""),
                "url": item.get("url")
                or f"https://news.ycombinator.com/item?id={item['id']}",
                "score": item.get("score", 0),
                "by": item.get("by", ""),
                "comments": item.get("descendants", 0),
                "category": "",
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dateLabel": datetime.now().strftime("%Y年%-m月%-d日"),
        "tagline": "今日のハッカーニュースを、日本語でひとつかみ。",
        "stories": stories,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
