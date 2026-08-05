# Job Search MCP Servers

Six [MCP](https://modelcontextprotocol.io) servers that let an AI assistant (Claude, Cursor, etc.) search live job listings across multiple sources.

| Server | Env vars needed | Coverage |
|---|---|---|
| `huntyourtribe-jobs-server.js` | none | huntyourtribe.com listings |
| `career-site-jobs-server.js` | `APIFY_API_TOKEN` | 175k+ career sites, 54 ATS platforms (paid, ~$4/1k jobs) |
| `adzuna-jobs-server.js` | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | job search + salary histograms/trends/top employers, 12+ countries |
| `jobspipe-jobs-server.js` | `JOBSPIPE_API_KEY` | 30+ ATS feeds incl. LinkedIn/Indeed/YC |
| `hirebase-jobs-server.js` | `HIREBASE_API_KEY` | job search + company profiles (free tier: 10 calls/day) |
| `theirstack-jobs-server.js` | `THEIRSTACK_API_KEY` | 223M jobs/195 countries + company technographics |

## Setup

1. Install [Node.js](https://nodejs.org) 18+.
2. `npm install` in this directory.
3. Get your **own** free-tier API key for whichever servers you want (see table above for which service). **Do not reuse someone else's key** — they're tied to that person's account/quota and most providers' terms prohibit sharing them:
   - Adzuna: developer.adzuna.com
   - JobsPipe: jobspipe.dev/signup
   - HireBase: hirebase.org/signup
   - TheirStack: theirstack.com (supports OAuth login too, no key needed)
   - Apify (career-site-jobs): apify.com
4. Register each server with your MCP client, passing your key(s) as env vars. Example with Claude Code:

   ```bash
   claude mcp add -s user adzuna-jobs -e ADZUNA_APP_ID=xxx -e ADZUNA_APP_KEY=xxx -- node /path/to/adzuna-jobs-server.js
   ```

   (repeat per server, only passing the env vars that server needs)

## Notes

- Your target location, role, and resume are **not** part of this repo — those are just things you tell your AI assistant in conversation once the servers are connected. The servers are generic search tools; nothing here is personalized.
- `huntyourtribe-jobs-server.js` needs no key and works out of the box.
- `career-site-jobs-server.js` costs real money per call (Apify billing) — keep `limit` low.
- `hirebase-jobs-server.js` is capped at 10 free calls/day — use filters to make each one count.
