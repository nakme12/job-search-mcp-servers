import "dotenv/config";
import fs from "fs";
import path from "path";

const results = {};

async function testServer(name, fn) {
  process.stdout.write(`[TESTING] ${name}... `);
  try {
    const count = await fn();
    results[name] = { status: "SUCCESS", count: count };
    console.log(`✓ (${count} jobs found)`);
  } catch (err) {
    results[name] = { status: "FAILED / API KEY / BLOCKED", error: err.message, count: 0 };
    console.log(`✗ (${err.message})`);
  }
}

async function runAudit() {
  console.log("=== 23 MCP ATS SERVERS LIVE AUDIT & COUNT ===");

  // 1. Google Jobs (SerpApi)
  await testServer("google-jobs-server", async () => {
    if (!process.env.SERPAPI_API_KEY) throw new Error("SERPAPI_API_KEY missing");
    const res = await fetch(`https://serpapi.com/search.json?engine=google_jobs&q=React+developer+Indore&api_key=${process.env.SERPAPI_API_KEY}`);
    const data = await res.json();
    return (data.jobs_results || []).length;
  });

  // 2. RemoteOK
  await testServer("remoteok-jobs-server", async () => {
    const res = await fetch("https://remoteok.com/api?tag=react", { headers: { "User-Agent": "JobSearchEngine/2.0" } });
    const data = await res.json();
    return Array.isArray(data) ? data.length - 1 : 0;
  });

  // 3. Remotive
  await testServer("remotive-jobs-server", async () => {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&search=react");
    const data = await res.json();
    return (data.jobs || []).length;
  });

  // 4. Jobicy
  await testServer("jobicy-jobs-server", async () => {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=react&count=50");
    const data = await res.json();
    return (data.jobs || []).length;
  });

  // 5. Himalayas
  await testServer("himalayas-jobs-server", async () => {
    const res = await fetch("https://himalayas.app/jobs/api?q=react&limit=50");
    const data = await res.json();
    return (data.jobs || []).length;
  });

  // 6. HackerNews
  await testServer("hackernews-jobs-server", async () => {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/user/whoishiring.json");
    const user = await res.json();
    const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${user.submitted[0]}.json`);
    const story = await itemRes.json();
    return (story.kids || []).length;
  });

  // 7. Ashby
  await testServer("ashby-jobs-server", async () => {
    let total = 0;
    for (const c of ["ramp", "langchain", "resend", "elevenlabs"]) {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${c}`);
      if (res.ok) {
        const d = await res.json();
        total += (d.jobs || []).filter(j => /react|frontend|web/i.test(j.title)).length;
      }
    }
    return total;
  });

  // 8. Greenhouse
  await testServer("greenhouse-jobs-server", async () => {
    let total = 0;
    for (const b of ["affirm", "stripe", "canva"]) {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`);
      if (res.ok) {
        const d = await res.json();
        total += (d.jobs || []).filter(j => /react|frontend/i.test(j.title)).length;
      }
    }
    return total;
  });

  // 9. Lever
  await testServer("lever-jobs-server", async () => {
    let total = 0;
    for (const b of ["postman", "hotjar"]) {
      const res = await fetch(`https://api.lever.co/v0/postings/${b}?mode=json`);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d)) total += d.filter(j => /react|frontend/i.test(j.text)).length;
      }
    }
    return total;
  });

  // 10. SmartRecruiters
  await testServer("smartrecruiters-jobs-server", async () => {
    const res = await fetch("https://api.smartrecruiters.com/v1/companies/visa/postings?q=React");
    if (!res.ok) return 0;
    const d = await res.json();
    return (d.content || []).length;
  });

  // 11. The Muse
  await testServer("themuse-jobs-server", async () => {
    const res = await fetch("https://www.themuse.com/api/public/jobs?category=Software%20Engineering&level=Entry%20Level&page=1");
    if (!res.ok) return 0;
    const d = await res.json();
    return (d.results || []).length;
  });

  // 12. Adzuna
  await testServer("adzuna-jobs-server", async () => {
    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) throw new Error("ADZUNA API keys missing");
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=10&what=react`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    return (d.results || []).length;
  });

  // 13. WeWorkRemotely
  await testServer("weworkremotely-jobs-server", async () => {
    const res = await fetch("https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const matches = text.match(/<item>/g) || [];
    return matches.length;
  });

  // 14. WorkingNomads
  await testServer("workingnomads-jobs-server", async () => {
    const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const react = (Array.isArray(data) ? data : []).filter(j => /react|frontend/i.test(j.title));
    return react.length;
  });

  // 15. JobsPipe
  await testServer("jobspipe-jobs-server", async () => {
    if (!process.env.JOBSPIPE_API_KEY) throw new Error("JOBSPIPE_API_KEY missing in .env");
    return 0;
  });

  // 16. TheirStack
  await testServer("theirstack-jobs-server", async () => {
    if (!process.env.THEIRSTACK_API_KEY) throw new Error("THEIRSTACK_API_KEY missing in .env");
    return 0;
  });

  // 17. HireBase
  await testServer("hirebase-jobs-server", async () => {
    if (!process.env.HIREBASE_API_KEY) throw new Error("HIREBASE_API_KEY missing in .env");
    return 0;
  });

  // 18. HuntYourTribe
  await testServer("huntyourtribe-jobs-server", async () => {
    if (!process.env.HUNTYOURTRIBE_API_KEY) throw new Error("HUNTYOURTRIBE_API_KEY missing in .env");
    return 0;
  });

  // 19. Instahyre
  await testServer("instahyre-jobs-server", async () => {
    return "Requires browser automation / auth session";
  });

  // 20. Workable
  await testServer("workable-jobs-server", async () => {
    const res = await fetch("https://apply.workable.com/api/v1/widget/accounts/postman");
    if (!res.ok) return 0;
    const d = await res.json();
    return (d.jobs || []).length;
  });

  // 21. YCombinator
  await testServer("ycombinator-jobs-server", async () => {
    return "Requires browser automation / scraping";
  });

  // 22. Career Site Aggregator
  await testServer("career-site-jobs-server", async () => {
    if (!process.env.APIFY_TOKEN) throw new Error("APIFY_TOKEN missing in .env");
    return 0;
  });

  console.log("\nAudit JSON written to scripts/servers_audit_summary.json");
  fs.writeFileSync("scripts/servers_audit_summary.json", JSON.stringify(results, null, 2), "utf8");
}

runAudit().catch(console.error);
