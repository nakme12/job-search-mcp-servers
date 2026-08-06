import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";

// HireBase's own `experience_level` label has been observed to be wrong (once
// labelled a role "Junior / Associate" while its own yoe_range said 3-5 years) -
// so this filter always cross-checks the actual title/description text too,
// rather than trusting the self-reported label alone.
function filterJobsByExperience(jobs, maxYearsExperience, excludeSeniorTitles) {
  const allJobs = jobs ?? [];
  const kept = allJobs.filter((j) => {
    const exp = evaluateExperience(
      {
        title: j.job_title,
        description: j.description,
        structuredMinYears: j.yoe_range?.min ?? null,
        structuredSeniorityLabel: j.experience_level,
      },
      maxYearsExperience,
      excludeSeniorTitles
    );
    j.detected_min_years_experience = exp.detected_min_years_experience;
    j.looks_senior = exp.looks_senior;
    return !exp.exclude;
  });
  return { kept, filtered_out_count: allJobs.length - kept.length };
}

const API_KEY = process.env.HIREBASE_API_KEY;
if (!API_KEY) {
  console.error("Missing HIREBASE_API_KEY env var. Set it in your MCP client config's env block.");
  process.exit(1);
}

const BASE = "https://api.hirebase.org/v2";
const stringArray = () => z.array(z.string()).optional();

const server = new McpServer({
  name: "hirebase-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search HireBase job listings",
    description:
      "Search live job postings via HireBase's traditional filter-based search. " +
      "NOTE: the free tier is limited to 10 API calls/day - use filters to make each call count.",
    inputSchema: {
      job_titles: stringArray().describe("Job titles to match, e.g. ['Software Engineer']"),
      keywords: stringArray().describe("Keywords in description, technologies, skills, benefits"),
      company_keywords: stringArray().describe("Keywords in company description/services/products"),
      location_types: z.array(z.enum(["Remote", "Hybrid", "In-Person"])).optional(),
      geo_locations: z
        .array(z.object({ city: z.string().optional(), region: z.string().optional(), country: z.string().optional() }))
        .optional()
        .describe("Structured locations to filter by"),
      geofilter_params: z
        .object({
          mode: z.enum(["auto", "weak", "strict", "box"]).optional(),
          radius: z.number().optional().describe("Default 25.0"),
          unit: z.enum(["mi", "km", "degrees"]).optional(),
        })
        .optional(),
      experience: z.array(z.enum(["Entry", "Junior", "Mid", "Senior", "Executive"])).optional(),
      yoe: z.object({ min: z.number().optional(), max: z.number().optional() }).optional().describe("Years of experience range"),
      job_types: z.array(z.enum(["Full Time", "Part Time", "Contract", "Internship"])).optional().describe("Use plural 'job_types', not 'job_type'"),
      job_category: stringArray().describe("Category tags from the job_categories tool"),
      company_types: stringArray().describe("Company size buckets, e.g. '1-10', '11-50', '51-200'"),
      job_board: stringArray().describe("Source job boards to restrict to"),
      company_name: z.string().optional(),
      company_slug: z.string().optional(),
      salary: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
      industry: stringArray(),
      days_ago: z.number().int().optional().describe("Only jobs posted within this many days"),
      date_posted: z.string().optional().describe("YYYY-MM-DD"),
      currency: z.string().optional().describe("USD, EUR, GBP, etc."),
      visa: z.enum(["true", "false"]).optional().describe("Visa sponsorship filter"),
      hide_recruiting_agencies: z.enum(["true", "false"]).optional(),
      include_no_salary: z.enum(["true", "false"]).optional().describe("Include jobs without salary when `salary` filter is set"),
      include_yoe: z.enum(["true", "false"]).optional().describe("Include jobs without YOE when `yoe` filter is set"),
      filter_incomplete_jobs: z.enum(["true", "false"]).optional(),
      return_raw_description: z.enum(["true", "false"]).optional().describe("Return full HTML description in description_raw"),
      sort_by: z.enum(["relevance", "date_posted", "salary", "company", "yoe"]).optional(),
      sort_order: z.enum(["asc", "desc"]).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): drops jobs whose title/" +
            "description text, `experience_level`, or `yoe_range` implies more years than this. HireBase's own " +
            "`experience_level` label has been seen to be wrong, so this always double-checks the actual text too. " +
            "Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
    },
  },
  async ({ maxYearsExperience, excludeSeniorTitles, ...args }) => {
    const body = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) body[key] = value;
    }
    const result = await hirebasePost("/jobs/search", body);
    if (result.isError) return result;

    let data;
    try {
      data = JSON.parse(result.content[0].text);
    } catch {
      return result;
    }
    const { kept, filtered_out_count } = filterJobsByExperience(data.jobs, maxYearsExperience, excludeSeniorTitles);
    return { content: [{ type: "text", text: JSON.stringify({ ...data, jobs: kept, filtered_out_count }, null, 2) }] };
  }
);

server.registerTool(
  "get_job_by_id",
  {
    title: "Get HireBase job by ID",
    description: "Retrieve full details for a specific job posting by its HireBase ID.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => hirebaseGet(`/jobs/${encodeURIComponent(id)}`)
);

server.registerTool(
  "get_company",
  {
    title: "Get HireBase company profile",
    description: "Fetch a detailed company profile by its HireBase slug.",
    inputSchema: { slug: z.string() },
  },
  async ({ slug }) => hirebaseGet(`/companies/${encodeURIComponent(slug)}`)
);

server.registerTool(
  "get_company_jobs",
  {
    title: "Get a company's open jobs",
    description:
      "Retrieve a paginated list of job openings for a specific company by its HireBase slug. Applies the same " +
      "experience filter as search_jobs by default.",
    inputSchema: {
      slug: z.string(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      maxYearsExperience: z.number().default(2).describe("Same as search_jobs. Set high (e.g. 99) to disable."),
      excludeSeniorTitles: z.boolean().default(true),
    },
  },
  async ({ slug, page, limit, maxYearsExperience, excludeSeniorTitles }) => {
    const result = await hirebaseGet(`/companies/${encodeURIComponent(slug)}/jobs`, { page, limit });
    if (result.isError) return result;

    let data;
    try {
      data = JSON.parse(result.content[0].text);
    } catch {
      return result;
    }
    const { kept, filtered_out_count } = filterJobsByExperience(data.jobs, maxYearsExperience, excludeSeniorTitles);
    return { content: [{ type: "text", text: JSON.stringify({ ...data, jobs: kept, filtered_out_count }, null, 2) }] };
  }
);

server.registerTool(
  "list_job_categories",
  {
    title: "List HireBase job categories",
    description: "Retrieve the full list of job category tags HireBase supports, for use with search_jobs' `job_category` filter.",
    inputSchema: {},
  },
  async () => hirebaseGet("/data/categories")
);

async function hirebasePost(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return toToolResult(response);
}

async function hirebaseGet(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { "x-api-key": API_KEY } });
  return toToolResult(response);
}

async function toToolResult(response) {
  const text = await response.text();
  if (!response.ok) {
    return { isError: true, content: [{ type: "text", text: `HireBase request failed: HTTP ${response.status} - ${text}` }] };
  }
  return { content: [{ type: "text", text }] };
}

const transport = new StdioServerTransport();
await server.connect(transport);
