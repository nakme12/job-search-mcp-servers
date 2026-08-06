import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";

const API_KEY = process.env.SERPAPI_API_KEY;
if (!API_KEY) {
  console.error("Missing SERPAPI_API_KEY env var. Get a free key at https://serpapi.com/ (100 searches/month free).");
  process.exit(1);
}

const BASE = "https://serpapi.com/search";

const server = new McpServer({
  name: "google-jobs",
  version: "1.0.0",
});

async function serpapiGet(params) {
  const url = new URL(BASE);
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    return { isError: true, content: [{ type: "text", text: `SerpApi request failed: HTTP ${response.status} - ${text.slice(0, 500)}` }] };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { isError: true, content: [{ type: "text", text: `Failed to parse SerpApi response: ${text.slice(0, 500)}` }] };
  }

  if (data.error) {
    return { isError: true, content: [{ type: "text", text: `SerpApi error: ${data.error}` }] };
  }

  return { data };
}

server.registerTool(
  "search_jobs",
  {
    title: "Search Google Jobs",
    description:
      "Search job listings aggregated by Google Jobs (pulls from LinkedIn, Indeed, company career pages, and " +
      "many other boards) via SerpApi. NOTE: each call consumes one SerpApi search credit - the free tier is only " +
      "100 searches/month, so keep queries broad and purposeful rather than polling. " +
      "Returns up to 10 jobs per page; use `next_page_token` from a previous response to page further. " +
      "To narrow results, read the `filters` array in the response and pass a filter's `uds` value back via the `uds` param. " +
      "\n\nEXPERIENCE FILTERING (default ON, same rule as every other job-search server in this repo): Google Jobs " +
      "has no structured experience-level field, so this regex-scans each job's title/description for explicit " +
      "year mentions ('3+ years', 'minimum 3 years', etc.) and seniority words (Senior/Lead/Staff/Principal/" +
      "Architect/Manager/Director). Drops anything over `maxYearsExperience` (default 2) or reading senior, and " +
      "returns `filtered_out_count`. Kept jobs still carry `detected_min_years_experience`/`looks_senior` for " +
      "transparency. Raise `maxYearsExperience` or set `excludeSeniorTitles: false` as the candidate's real " +
      "experience grows.",
    inputSchema: {
      q: z.string().describe("Search query, e.g. 'frontend developer react' or 'react developer indore'"),
      location: z
        .string()
        .optional()
        .describe("Geographic origin of the search, e.g. 'Indore, Madhya Pradesh, India' or 'India'"),
      gl: z.string().optional().describe("Two-letter country code, e.g. 'in' for India"),
      hl: z.string().optional().describe("Two-letter language code, e.g. 'en'"),
      lrad: z.number().optional().describe("Search radius in kilometers around `location`"),
      uds: z
        .string()
        .optional()
        .describe("Google filter token, taken from the `uds` field of an entry in a previous response's `filters` array"),
      next_page_token: z.string().optional().describe("Token from a previous response to fetch the next page"),
      no_cache: z.boolean().optional().describe("Force a fresh fetch instead of a cached result (uses a credit either way)"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe("Drop jobs whose detected minimum years-of-experience requirement exceeds this. Set high (e.g. 99) to disable."),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
    },
  },
  async ({ maxYearsExperience, excludeSeniorTitles, ...args }) => {
    const result = await serpapiGet(args);
    if (result.isError) return result;
    const { data } = result;

    const allJobs = (data.jobs_results ?? []).map((j) => {
      const exp = evaluateExperience({ title: j.title, description: j.description }, maxYearsExperience, excludeSeniorTitles);
      return {
        title: j.title,
        company: j.company_name,
        location: j.location,
        via: j.via,
        posted: j.detected_extensions?.posted_at,
        schedule: j.detected_extensions?.schedule_type,
        work_from_home: j.detected_extensions?.work_from_home,
        salary: j.detected_extensions?.salary,
        apply_links: (j.apply_options ?? []).map((a) => ({ title: a.title, link: a.link })),
        description: j.description,
        job_id: j.job_id,
        detected_min_years_experience: exp.detected_min_years_experience,
        looks_senior: exp.looks_senior,
        _exclude: exp.exclude,
      };
    });

    const jobs = allJobs.filter((j) => !j._exclude).map(({ _exclude, ...j }) => j);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              count: jobs.length,
              filtered_out_count: allJobs.length - jobs.length,
              next_page_token: data.serpapi_pagination?.next_page_token ?? null,
              // Surface available refinement filters so a follow-up call can narrow results.
              filters: (data.filters ?? []).map((f) => ({ name: f.name, uds: f.uds })),
              jobs,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.registerTool(
  "get_account_usage",
  {
    title: "Check SerpApi credit usage",
    description:
      "Check how many SerpApi searches you have left this month. Free tier is 100/month. " +
      "This call does NOT consume a search credit.",
    inputSchema: {},
  },
  async () => {
    const url = new URL("https://serpapi.com/account");
    url.searchParams.set("api_key", API_KEY);
    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `SerpApi account check failed: HTTP ${response.status} - ${text.slice(0, 300)}` }] };
    }

    // SerpApi echoes the API key and account email back; strip them so the
    // credential never lands in tool output, transcripts, or logs.
    let account;
    try {
      account = JSON.parse(text);
    } catch {
      return { content: [{ type: "text", text: "Could not parse account response." }] };
    }
    const { api_key, account_email, account_id, ...safe } = account;

    return { content: [{ type: "text", text: JSON.stringify(safe, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
