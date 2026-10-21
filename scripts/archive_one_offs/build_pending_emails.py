import json
import pandas as pd
import os

with open('applied_and_seen_tracker.json', 'r', encoding='utf-8') as f:
    tracker = json.load(f)

applied_emails = set(str(a.get('recipient_or_url', '')).lower() for a in tracker.get('applied', []))

pending_emails = []

# 1. Indore IT companies
df = pd.read_excel('resumes/Indore_IT_Companies_51-500_Audited.xlsx')
for idx, row in df.iterrows():
    email = str(row.get('Email', '')).strip()
    company = str(row.get('Company Name', '')).strip()
    if '@' in email and email.lower() not in applied_emails:
        if not any(p['email'].lower() == email.lower() for p in pending_emails):
            pending_emails.append({
                'company': company,
                'email': email,
                'role': 'Frontend / React Developer',
                'location': 'Indore, MP',
                'resume': 'Pratik Patidar Resume - React Developer.pdf'
            })

# 2. Guys dont ignore group verified
with open('scripts/guys_dont_final_filtered.json', 'r', encoding='utf-8') as f:
    guys = json.load(f)

for g in guys:
    emails = g.get('allEmails', [])
    contact = g.get('contact', '')
    em = contact if '@' in contact else (emails[0] if len(emails) > 0 else None)
    if em and '@' in em and em.lower() not in applied_emails:
        if not any(p['email'].lower() == em.lower() for p in pending_emails):
            pending_emails.append({
                'company': g.get('company', 'Tech Firm'),
                'email': em,
                'role': g.get('role', 'Frontend / React Developer'),
                'location': 'India / Remote',
                'resume': 'Pratik Patidar Resume - React Developer.pdf'
            })

print(f"Total pending verified emails to reach 31+: {len(pending_emails)}")
for i, p in enumerate(pending_emails, 1):
    print(f"{i}. {p['company']} -> {p['email']}")

with open('scripts/pending_verified_emails_queue.json', 'w', encoding='utf-8') as f:
    json.dump(pending_emails, f, indent=2)
