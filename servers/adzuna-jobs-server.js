import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const APP_ID = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;
if (!APP_ID || !APP_KEY) {
  console.error(
    "Missing ADZUNA_APP_ID / ADZUNA_APP_KEY env vars. Set them in your MCP client config's env block."
  );
  process.exit(1);
}

const BASE = "https://api.adzuna.com/v1/api/jobs";

const countryParam = z
  .string()
  .describe(
    "Adzuna country code, e.g. gb, us, au, at, br, ca, de, fr, in, it, mx, nl, nz, pl, ru, sg, za, es, ch"
  );

async function adzunaGet(path, params) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("app_key", APP_KEY);
  url.searchParams.set("content-type", "application/json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    return { isError: true, content: [{ type: "text", text: `Adzuna request failed: HTTP ${response.status} - ${text}` }] };
  }

  return { content: [{ type: "text", text }] };
}

const server = new McpServer({
  name: "adzuna-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Adzuna job listings",
    description: "Search live job postings via the Adzuna API, with salary, location, and contract-type filters.",
    inputSchema: {
      country: countryParam,
      page: z.number().int().min(1).default(1),
      what: z.string().optional().describe("Keywords to search for, e.g. 'software engineer'"),
      what_exclude: z.string().optional().describe("Keywords to exclude"),
      where: z.string().optional().describe("Location, e.g. 'London' or 'New York'"),
      distance: z.number().optional().describe("Search radius in miles from `where`"),
      salary_min: z.number().optional(),
      salary_max: z.number().optional(),
      full_time: z.boolean().optional(),
      part_time: z.boolean().optional(),
      permanent: z.boolean().optional(),
      contract: z.boolean().optional(),
      category: z.string().optional().describe("Category tag from the job_categories tool, e.g. 'it-jobs'"),
      sort_by: z.enum(["default", "hybrid", "date", "salary", "relevance"]).optional(),
      max_days_old: z.number().int().optional(),
      results_per_page: z.number().int().min(1).max(50).default(20),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): Adzuna has no structured " +
            "experience field, so this regex-scans title/description and drops jobs implying more years than this. " +
            "Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe(
          "Client-side safety net against `created`. `max_days_old` above is Adzuna's own server-side filter - " +
            "use both together or either alone. Set high (e.g. 9999) to disable."
        ),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as an internship/traineeship."),
    },
  },
  async ({ country, page, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships, ...rest }) => {
    const params = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue;
      params[key] = typeof value === "boolean" ? (value ? 1 : 0) : value;
    }
    const result = await adzunaGet(`${country}/search/${page}`, params);
    if (result.isError) return result;

    let data;
    try {
      data = JSON.parse(result.content[0].text);
    } catch {
      return result;
    }

    const allJobs = data.results ?? [];
    const jobs = allJobs.filter((j) => {
      const exp = evaluateExperience({ title: j.title, description: j.description }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness({ title: j.title, postedDate: j.created }, maxAgeDays, excludeInternships);
      j.detected_min_years_experience = exp.detected_min_years_experience;
      j.looks_senior = exp.looks_senior;
      j.is_internship = fresh.is_internship;
      j.age_days = fresh.age_days;
      return !exp.exclude && !fresh.exclude;
    });

    return {
      content: [
        { type: "text", text: JSON.stringify({ ...data, results: jobs, filtered_out_count: allJobs.length - jobs.length }, null, 2) },
      ],
    };
  }
);

server.registerTool(
  "salary_histogram",
  {
    title: "Adzuna salary histogram",
    description: "Get the distribution of salaries (vacancy counts per salary bracket) for a search query.",
    inputSchema: {
      country: countryParam,
      what: z.string().describe("Keywords to search for, e.g. 'software engineer'"),
      where: z.string().optional().describe("Location to narrow the histogram to"),
    },
  },
  async ({ country, what, where }) => adzunaGet(`${country}/histogram`, { what, location0: where })
);

server.registerTool(
  "salary_history",
  {
    title: "Adzuna historical salary trend",
    description: "Get month-by-month average salary trend for a search query over roughly the past year.",
    inputSchema: {
      country: countryParam,
      what: z.string().describe("Keywords to search for, e.g. 'software engineer'"),
      where: z.string().optional().describe("Location to narrow the trend to"),
    },
  },
  async ({ country, what, where }) => adzunaGet(`${country}/history`, { what, location0: where })
);

server.registerTool(
  "top_companies",
  {
    title: "Adzuna top hiring companies",
    description: "Get the companies with the most job postings matching a search query.",
    inputSchema: {
      country: countryParam,
      what: z.string().describe("Keywords to search for, e.g. 'software engineer'"),
      where: z.string().optional().describe("Location to narrow the leaderboard to"),
    },
  },
  async ({ country, what, where }) => adzunaGet(`${country}/top_companies`, { what, location0: where })
);

server.registerTool(
  "geodata",
  {
    title: "Adzuna job counts by region",
    description: "Get job posting counts broken down by region/area for a search query, useful for finding where a role is in demand.",
    inputSchema: {
      country: countryParam,
      what: z.string().describe("Keywords to search for, e.g. 'software engineer'"),
    },
  },
  async ({ country, what }) => adzunaGet(`${country}/geodata`, { what })
);

server.registerTool(
  "job_categories",
  {
    title: "List Adzuna job categories",
    description: "List the valid category tags for a country, for use with search_jobs' `category` filter.",
    inputSchema: {
      country: countryParam,
    },
  },
  async ({ country }) => adzunaGet(`${country}/categories`, {})
);

const transport = new StdioServerTransport();
await server.connect(transport);
