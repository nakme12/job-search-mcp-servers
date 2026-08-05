import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
    },
  },
  async (args) => {
    const body = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) body[key] = value;
    }
    return hirebasePost("/jobs/search", body);
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
    description: "Retrieve a paginated list of job openings for a specific company by its HireBase slug.",
    inputSchema: {
      slug: z.string(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
    },
  },
  async ({ slug, page, limit }) =>
    hirebaseGet(`/companies/${encodeURIComponent(slug)}/jobs`, { page, limit })
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
