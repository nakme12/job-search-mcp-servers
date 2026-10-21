import "dotenv/config";
import fs from "fs";

async function ping(name, fn) {
  const start = Date.now();
  try {
    const res = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (7s)")), 7000))
    ]);
    const duration = ((Date.now() - start)/1000).toFixed(2) + "s";
    return { name, status: "ACTIVE / WORKING", code: 200, count: res.count || 0, details: res.details || "OK", latency: duration };
  } catch (err) {
    const duration = ((Date.now() - start)/1000).toFixed(2) + "s";
    return { name, status: "ERROR / INACTIVE", code: err.message.includes("4") ? 400 : 500, count: 0, details: err.message, latency: duration };
  }
}

async function auditAllServers() {
  const results = [];

  // 1. PlacementIndia
  results.push(await ping("placementindia-mcp", async () => {
    const r = await fetch("https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_experience=0", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = await r.text();
    const count = (t.match(/job-name/g) || []).length;
    return { count, details: "Scrapes direct recruiter listings live" };
  }));

  // 2. RemoteOK
  results.push(await ping("remoteok-jobs-server", async () => {
    const r = await fetch("https://remoteok.com/api?tag=react", { headers: { "User-Agent": "JobSearchEngine/2.0" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: Array.isArray(d) ? d.length - 1 : 0, details: "Public REST API live" };
  }));

  // 3. Remotive
  results.push(await ping("remotive-jobs-server", async () => {
    const r = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&search=react");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.jobs?.length || 0, details: "Public REST API live" };
  }));

  // 4. Jobicy
  results.push(await ping("jobicy-jobs-server", async () => {
    const r = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=react&count=20");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.jobs?.length || 0, details: "Public REST API live" };
  }));

  // 5. Himalayas
  results.push(await ping("himalayas-jobs-server", async () => {
    const r = await fetch("https://himalayas.app/jobs/api?q=react&limit=20");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.jobs?.length || 0, details: "Public REST API live" };
  }));

  // 6. Working Nomads
  results.push(await ping("workingnomads-jobs-server", async () => {
    const r = await fetch("https://www.workingnomads.com/api/exposed_jobs/");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: Array.isArray(d) ? d.length : 0, details: "Public REST API live" };
  }));

  // 7. WeWorkRemotely
  results.push(await ping("weworkremotely-jobs-server", async () => {
    const r = await fetch("https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = await r.text();
    const count = (t.match(/<item>/g) || []).length;
    return { count, details: "RSS XML Feed live" };
  }));

  // 8. HackerNews Who Is Hiring
  results.push(await ping("hackernews-jobs-server", async () => {
    const r = await fetch("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=1");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.hits?.length || 0, details: "Algolia HN API live" };
  }));

  // 9. Google Jobs (SerpApi)
  results.push(await ping("google-jobs-server", async () => {
    if (!process.env.SERPAPI_API_KEY) throw new Error("No API key");
    const r = await fetch(`https://serpapi.com/search?engine=google_jobs&api_key=${process.env.SERPAPI_API_KEY}&q=React+developer+Indore&hl=en&gl=in`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.jobs_results?.length || 0, details: "SerpApi Live Key valid" };
  }));

  // 10. Greenhouse ATS Direct
  results.push(await ping("greenhouse-jobs-server", async () => {
    const r = await fetch("https://boards-api.greenhouse.io/v1/boards/affirm/jobs");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.jobs?.length || 0, details: "Greenhouse Public API live" };
  }));

  // 11. Ashby ATS Direct
  results.push(await ping("ashby-jobs-server", async () => {
    const r = await fetch("https://api.ashbyhq.com/posting-api/job-board/tavily");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.jobs?.length || 0, details: "Ashby Public API live" };
  }));

  // 12. Lever ATS Direct
  results.push(await ping("lever-jobs-server", async () => {
    const r = await fetch("https://api.lever.co/v0/postings/postman?mode=json");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: Array.isArray(d) ? d.length : 0, details: "Lever Public API live" };
  }));

  // 13. SmartRecruiters ATS Direct
  results.push(await ping("smartrecruiters-jobs-server", async () => {
    const r = await fetch("https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.content?.length || 0, details: "SmartRecruiters Public API live" };
  }));

  // 14. Workable ATS Direct
  results.push(await ping("workable-jobs-server", async () => {
    const r = await fetch("https://apply.workable.com/api/v3/accounts/infoloop/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
    return { count: r.status === 200 ? 1 : 0, details: `Workable endpoint HTTP ${r.status}` };
  }));

  // 15. The Muse
  results.push(await ping("themuse-jobs-server", async () => {
    const r = await fetch("https://www.themuse.com/api/public/jobs?category=Software%20Engineering&page=1");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.results?.length || 0, details: "TheMuse API live" };
  }));

  // 16. Instahyre
  results.push(await ping("instahyre-jobs-server", async () => {
    const r = await fetch("https://www.instahyre.com/api/v1/job_search/?job_functions=3&experience_level=0-2", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.objects?.length || 0, details: "Instahyre API live" };
  }));

  // 17. TheirStack
  results.push(await ping("theirstack-jobs-server", async () => {
    if (!process.env.THEIRSTACK_API_KEY) throw new Error("No API key");
    const r = await fetch("https://api.theirstack.com/v1/jobs/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.THEIRSTACK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ page: 0, limit: 5 })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.data?.length || 0, details: "TheirStack Live Key valid" };
  }));

  // 18. JobsPipe
  results.push(await ping("jobspipe-jobs-server", async () => {
    if (!process.env.JOBSPIPE_API_KEY) throw new Error("No API key");
    const r = await fetch("https://api.jobspipe.dev/v1/jobs/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.JOBSPIPE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 5 })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { count: d.results?.length || 0, details: "JobsPipe Live Key valid" };
  }));

  // 19. HireBase
  results.push(await ping("hirebase-jobs-server", async () => {
    if (!process.env.HIREBASE_API_KEY) throw new Error("No API key");
    const r = await fetch("https://api.hirebase.org/v1/jobs", {
      headers: { Authorization: `Bearer ${process.env.HIREBASE_API_KEY}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { count: 1, details: "HireBase Live Key valid" };
  }));

  // 20. Career Site (Apify)
  results.push(await ping("career-site-jobs-server", async () => {
    if (!process.env.APIFY_API_TOKEN) throw new Error("No API token");
    const r = await fetch(`https://api.apify.com/v2/acts?token=${process.env.APIFY_API_TOKEN}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { count: 1, details: "Apify Live Token valid" };
  }));

  // 21. Adzuna (Permanently Banned)
  results.push({
    name: "adzuna-jobs-server",
    status: "BANNED / DECOMMISSIONED",
    code: 0,
    count: 0,
    details: "Rule 48 Hard Ban (Low quality, dead Cutshort redirects)",
    latency: "0s"
  });

  fs.writeFileSync("scripts/servers_audit_summary.json", JSON.stringify(results, null, 2));
  console.log("Audit complete. Written to scripts/servers_audit_summary.json");
}

auditAllServers().catch(console.error);
