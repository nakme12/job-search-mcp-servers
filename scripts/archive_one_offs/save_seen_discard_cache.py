import json
import glob
import re

# Load Master Tracker
with open('applied_and_seen_tracker.json', 'r', encoding='utf-8') as f:
    tracker = json.load(f)

applied_entries = tracker.get('applied', [])
applied_urls = set(str(a.get('recipient_or_url', '')).strip().lower() for a in applied_entries)
applied_names = set(str(a.get('company', '')).strip().lower() for a in applied_entries)

# Gather all seen/harvested unapplied jobs across all scraped JSON files
seen_unapplied_db = {}

# 1. MCP ATS Boards
with open('scripts/fresh_harvest_pool.json', 'r', encoding='utf-8') as f:
    for item in json.load(f):
        key = (item.get('apply_url') or item.get('url') or item.get('company') or '').strip().lower()
        if key and key not in applied_urls and item.get('company', '').lower() not in applied_names:
            seen_unapplied_db[key] = {
                'company': item.get('company'),
                'title': item.get('title'),
                'url': item.get('apply_url') or item.get('url'),
                'source': 'MCP ATS Boards',
                'status': 'SEEN_UNAPPLIED_DISCARD_ON_SWEEP'
            }

# 2. Easy Apply Jobs
with open('scripts/live_easy_apply_scraped.json', 'r', encoding='utf-8') as f:
    for item in json.load(f):
        key = (item.get('url') or item.get('company') or '').strip().lower()
        if key and key not in applied_urls:
            seen_unapplied_db[key] = {
                'company': item.get('company'),
                'title': item.get('title'),
                'url': item.get('url'),
                'source': 'LinkedIn Easy Apply',
                'status': 'SEEN_UNAPPLIED_DISCARD_ON_SWEEP'
            }

# 3. Guys dont ignore posts
with open('scripts/guys_dont_scraped_posts.json', 'r', encoding='utf-8') as f:
    for item in json.load(f):
        t = item.get('text', '')[:100].strip().lower()
        if t and t not in applied_urls:
            seen_unapplied_db[t] = {
                'snippet': item.get('text', '')[:150],
                'links': item.get('links', []),
                'source': 'LinkedIn Guys Group',
                'status': 'SEEN_UNAPPLIED_DISCARD_ON_SWEEP'
            }

# 4. Live Surfed posts
with open('scripts/live_harvested_surfed_full.json', 'r', encoding='utf-8') as f:
    for item in json.load(f):
        t = item.get('text', '')[:100].strip().lower()
        if t and t not in applied_urls:
            seen_unapplied_db[t] = {
                'snippet': item.get('text', '')[:150],
                'source': 'LinkedIn Past 24h Feed',
                'status': 'SEEN_UNAPPLIED_DISCARD_ON_SWEEP'
            }

seen_list = list(seen_unapplied_db.values())
print(f"Total Unique Unapplied Jobs/Leads saved into permanent discard cache: {len(seen_list)}")

with open('scripts/seen_unapplied_discard_cache.json', 'w', encoding='utf-8') as f:
    json.dump(seen_list, f, indent=2)

# Also update tracker's seen section so subsequent sweeps discard them automatically
if 'seen_unapplied' not in tracker:
    tracker['seen_unapplied'] = []

tracker['seen_unapplied'] = seen_list
tracker['stats'] = tracker.get('stats', {})
tracker['stats']['total_seen_cached'] = len(seen_list)

with open('applied_and_seen_tracker.json', 'w', encoding='utf-8') as f:
    json.dump(tracker, f, indent=2)

print(f"Master Tracker updated with {len(seen_list)} seen unapplied entries in 'seen_unapplied' key!")
