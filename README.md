# Job Search MCP Servers

Fourteen [MCP](https://modelcontextprotocol.io) servers that let an AI assistant (Claude, Cursor, etc.) search live job listings across multiple sources.

**Default filtering, every server:**

- `experience-filter.js` — `maxYearsExperience: 2` and `excludeSeniorTitles: true`, checked against whatever
  structured seniority field the source provides (where one exists) *and* a regex scan of the actual title/
  description text — cross-checked because source-provided labels have been observed to be wrong (e.g. HireBase
  once labelled a 3–5yr role "Junior/Associate"). Kept jobs carry `detected_min_years_experience`/`looks_senior`.
- `freshness-filter.js` — `excludeInternships: true` and `maxAgeDays: 90`, checked against a title/employment-type
  regex and whatever posted-date field the source provides (a source's own "reposted" date is used in place of
  the original post date where available, e.g. JobsPipe). Kept jobs carry `is_internship`/`age_days`.

Every response includes `filtered_out_count`. Relax any of the four params per-call as the candidate's situation
changes (e.g. `maxYearsExperience: 99` to see everything, `excludeInternships: false` to include internships).

**No key needed** — works immediately:

| Server | Coverage |
|---|---|
| `huntyourtribe-jobs-server.js` | huntyourtribe.com listings |
| `ashby-jobs-server.js` | Any single company's Ashby job board (public API, needs the company's slug) |
| `greenhouse-jobs-server.js` | Any single company's Greenhouse job board (needs the company's board token) |
| `lever-jobs-server.js` | Any single company's Lever job board (needs the company's slug; supports server-side team/location/commitment filters) |
| `remotive-jobs-server.js` | Remotive remote-jobs feed (small pool; attribution required) |
| `themuse-jobs-server.js` | The Muse jobs API (optional `THEMUSE_API_KEY` raises rate limit 500→3600/hr) |
| `remoteok-jobs-server.js` | RemoteOK feed (small pool; tags are SEO-stuffed, filter by title) |
| `jobicy-jobs-server.js` | Jobicy remote-jobs feed (has a real `jobLevel` field; `geo`/`industry` filters need discovery via `discover: 'locations'`/`'industries'`) |
| `instahyre-jobs-server.js` | Instahyre's public job-search API (India-focused). Undocumented API with no posting date or description field anywhere - freshness/age can't be computed for this source, only internship-title exclusion applies. Free-text keyword/location params are ignored server-side; filters by `job_functions`/`experience_level` instead. |

**Key required** — all have free tiers:

| Server | Env vars | Coverage |
|---|---|---|
| `adzuna-jobs-server.js` | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | job search + salary histograms/trends/top employers, 12+ countries |
| `jobspipe-jobs-server.js` | `JOBSPIPE_API_KEY` | 30+ ATS feeds incl. LinkedIn/Indeed/YC |
| `hirebase-jobs-server.js` | `HIREBASE_API_KEY` | job search + company profiles (free: 10 calls/day) |
| `theirstack-jobs-server.js` | `THEIRSTACK_API_KEY` | 223M jobs/195 countries + company technographics |
| `google-jobs-server.js` | `SERPAPI_API_KEY` | Google Jobs aggregate via SerpApi (free: 250 searches/mo). Strong for tier-2 cities |
| `career-site-jobs-server.js` | `APIFY_API_TOKEN` | 175k+ career sites, 54 ATS platforms (**paid**, ~$4/1k jobs) |
| `remoterocketship-jobs-server.js` | `APIFY_API_TOKEN` | remoterocketship.com via a third-party Apify scraper (no official API exists). **Paid**, and unlike the other Apify server here it's a recurring **~$19.89/month subscription** to that specific actor, not per-result. Response field names are best-effort (unverified against a live call) — confirm on first real use. |

## Setup

1. Install [Node.js](https://nodejs.org) 18+.
2. Clone this repo and run `npm install` in it.
3. Copy `.env.example` to `.env` and fill in keys for whichever servers you want (see below for how to get each one). You only need keys for the services you actually plan to use — `huntyourtribe-jobs-server.js` needs none and works immediately.
4. Register each server with your MCP client (see "Connecting to Claude" below).

**Do not reuse someone else's key.** They're tied to that person's account/quota, and most providers' terms prohibit sharing them. Each key below takes under a minute to get and doesn't require a credit card.

## How to get each API key

**Adzuna** (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`)
1. Go to https://developer.adzuna.com/ and sign up (free).
2. Confirm your email, then open your dashboard.
3. Copy the **Application ID** → `ADZUNA_APP_ID`.
4. Under "Application Keys," click **Create new key** → copy it as `ADZUNA_APP_KEY`.

**HireBase** (`HIREBASE_API_KEY`)
1. Go to https://www.hirebase.org/signup and create a free account.
2. Open **Profile → API Key** and copy it.
3. Free tier: 10 calls/day.

**JobsPipe** (`JOBSPIPE_API_KEY`)
1. Go to https://jobspipe.dev/signup and sign up (free tier: 100 credits/month).
2. Copy the key from your dashboard — it starts with `jp_live_`.

**TheirStack** (`THEIRSTACK_API_KEY`)
1. Go to https://theirstack.com/ and sign up (free tier: 200 credits/month).
2. Copy your API key from account settings.
3. Alternative: skip the key entirely and use TheirStack's OAuth login instead — supported natively by their MCP integration, no key management needed.

**Google Jobs / SerpApi** (`SERPAPI_API_KEY`)
1. Go to https://serpapi.com/ and sign up (no card needed).
2. Copy your private API key from the dashboard.
3. Free tier: 250 searches/month. Each `search_jobs` call spends one; `get_account_usage` is free.

**The Muse** (`THEMUSE_API_KEY`) — optional
1. Works with no key at 500 requests/hour.
2. For 3,600/hour, register at https://www.themuse.com/developers/api/v2 and set the key.

**Apify / career-site-jobs** (`APIFY_API_TOKEN`)
1. Go to https://apify.com/ and sign up.
2. Open **Settings → Integrations → API tokens** and copy a token.
3. This one is billed (~$4 per 1,000 jobs returned) — Apify includes ~$5 free credit/month, keep `limit` low to stay within it.

**Apify / remoterocketship-jobs** (`APIFY_API_TOKEN`, same token as above)
1. Same Apify account as above, but separately subscribe to the `scrapestorm/remote-rocketship-jobs-scraper---cheap` actor.
2. This is a recurring **~$19.89/month subscription** to that actor, not per-result billing — confirm you actually want the standing cost before subscribing.

## Connecting to Claude

With Claude Code, register each server with your key(s) as env vars:

```bash
claude mcp add -s user adzuna-jobs -e ADZUNA_APP_ID=xxx -e ADZUNA_APP_KEY=xxx -- node /path/to/adzuna-jobs-server.js
claude mcp add -s user hirebase-jobs -e HIREBASE_API_KEY=xxx -- node /path/to/hirebase-jobs-server.js
claude mcp add -s user jobspipe-jobs -e JOBSPIPE_API_KEY=xxx -- node /path/to/jobspipe-jobs-server.js
claude mcp add -s user theirstack-jobs -e THEIRSTACK_API_KEY=xxx -- node /path/to/theirstack-jobs-server.js
claude mcp add -s user career-site-jobs -e APIFY_API_TOKEN=xxx -- node /path/to/career-site-jobs-server.js
claude mcp add -s user remoterocketship-jobs -e APIFY_API_TOKEN=xxx -- node /path/to/remoterocketship-jobs-server.js
claude mcp add -s user google-jobs -e SERPAPI_API_KEY=xxx -- node /path/to/google-jobs-server.js

# no key needed
claude mcp add -s user huntyourtribe-jobs -- node /path/to/huntyourtribe-jobs-server.js
claude mcp add -s user ashby-jobs -- node /path/to/ashby-jobs-server.js
claude mcp add -s user remotive-jobs -- node /path/to/remotive-jobs-server.js
claude mcp add -s user themuse-jobs -- node /path/to/themuse-jobs-server.js
claude mcp add -s user remoteok-jobs -- node /path/to/remoteok-jobs-server.js
claude mcp add -s user instahyre-jobs -- node /path/to/instahyre-jobs-server.js
```

Only run the lines for servers you got a key for. `-s user` makes it available across all your projects; use `-s local` to scope it to one project instead.

Verify they connected:

```bash
claude mcp list
```

**Easiest path:** just paste this repo's README into Claude Code (or point it at this cloned folder) and ask it to "register whichever of these MCP servers I have keys for" — it can run the `claude mcp add` commands for you once you tell it which keys you've got.

## Notes

- Your target location, role, and resume are **not** part of this repo — those are just things you tell your AI assistant in conversation once the servers are connected. The servers are generic search tools; nothing here is personalized.
- `huntyourtribe-jobs-server.js` needs no key and works out of the box.
- `career-site-jobs-server.js` costs real money per call (Apify billing) — keep `limit` low.
- `hirebase-jobs-server.js` is capped at 10 free calls/day — use filters to make each one count.
