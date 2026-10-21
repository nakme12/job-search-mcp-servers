import json

with open('scripts/strictly_easy_apply_pool.json', 'r', encoding='utf-8') as f:
    pool = json.load(f)

# Rules:
# - Exclude React Native (strictly Web/Frontend)
# - Exclude ghost agencies like Quik Hire Staffing (Rule 15)
clean = []
for p in pool:
    t = p['title'].lower()
    c = p['company'].lower()
    if 'react native' in t:
        continue
    if 'quik hire' in c:
        continue
    clean.append({
        'company': p['company'],
        'title': p['title'].split('\n')[0].strip(),
        'location': p.get('location', 'India / Remote'),
        'url': p['url'],
        'isEasyApply': True
    })

print(f"Total Clean Easy Apply Targets: {len(clean)}")
for i, x in enumerate(clean, 1):
    print(f"{i}. {x['company']} | {x['title']} | {x['url']}")

with open('scripts/clean_easy_apply_targets.json', 'w', encoding='utf-8') as f:
    json.dump(clean, f, indent=2)
