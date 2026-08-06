import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";

const API_KEY = process.env.THEIRSTACK_API_KEY;
if (!API_KEY) {
  console.error("Missing THEIRSTACK_API_KEY env var. Set it in your MCP client config's env block.");
  process.exit(1);
}

const BASE = "https://api.theirstack.com";
const stringArray = () => z.array(z.string()).optional();
const extraFilters = () =>
  z
    .record(z.string(), z.any())
    .optional()
    .describe(
      "Escape hatch: any other TheirStack filter field not listed explicitly above (there are 100+ - see " +
        "https://theirstack.com/en/docs/api-reference/jobs/search_jobs_v1), merged into the request body as-is."
    );

async function theirstackPost(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    return { isError: true, content: [{ type: "text", text: `TheirStack request failed: HTTP ${response.status} - ${text}` }] };
  }
  return { content: [{ type: "text", text }] };
}

const server = new McpServer({
  name: "theirstack-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search TheirStack job listings",
    description:
      "Search 223M+ jobs across 195 countries via TheirStack, with filters on title, location, salary, seniority, " +
      "technology, and the hiring company's profile. `_or` filters match any value, `_not` filters exclude, `_and` " +
      "requires all. Each call consumes credits at the same rate as the REST API's job search endpoint.",
    inputSchema: {
      job_title_or: stringArray().describe("Keyword patterns to match in job titles"),
      job_title_not: stringArray(),
      job_country_code_or: stringArray().describe("2-letter ISO country codes"),
      job_country_code_not: stringArray(),
      job_location_or: stringArray().describe("Location strings to match"),
      job_location_not: stringArray(),
      remote: z.boolean().optional().describe("true: remote only, false: non-remote only, omit: all"),
      posted_at_max_age_days: z.number().int().optional().describe("0 = posted today, 1 = today+yesterday, etc."),
      posted_at_gte: z.string().optional().describe("YYYY-MM-DD"),
      posted_at_lte: z.string().optional().describe("YYYY-MM-DD"),
      job_seniority_or: stringArray(),
      employment_statuses_or: stringArray().describe("e.g. full_time, part_time, contract, internship"),
      min_salary_usd: z.number().optional(),
      max_salary_usd: z.number().optional(),
      job_technology_slug_or: stringArray().describe("Technology slugs mentioned in the job posting"),
      job_technology_slug_not: stringArray(),
      job_keyword_slug_or: stringArray(),
      easy_apply: z.boolean().optional(),
      is_closed: z.boolean().optional().describe("Filter by whether the posting has since closed"),
      company_name_or: stringArray().describe("Exact company names (case-sensitive)"),
      company_name_case_insensitive_or: stringArray(),
      company_name_partial_match_or: stringArray(),
      company_domain_or: stringArray(),
      company_country_code_or: stringArray(),
      industry_or: stringArray(),
      min_employee_count: z.number().int().optional(),
      max_employee_count: z.number().int().optional(),
      min_revenue_usd: z.number().int().optional(),
      max_revenue_usd: z.number().int().optional(),
      funding_stage_or: stringArray().describe("e.g. seed, series_a, series_b, ipo"),
      company_technology_slug_or: stringArray().describe("Technologies mentioned across a company's job postings"),
      only_yc_companies: z.boolean().optional(),
      blur_company_data: z
        .boolean()
        .optional()
        .describe("Preview mode: returns blurred sensitive data WITHOUT consuming API credits. Useful to sanity-check a query first."),
      page: z.number().int().optional().describe("Page number (page-based pagination)"),
      limit: z.number().int().optional().describe("Results per page"),
      include_total_results: z.boolean().optional(),
      extra: extraFilters(),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): drops jobs whose title/" +
            "description text or `seniority` field implies more years than this. Set high (e.g. 99) to disable. " +
            "`job_seniority_or` above is TheirStack's own server-side filter - use both together or either alone."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
    },
  },
  async ({ extra, maxYearsExperience, excludeSeniorTitles, ...rest }) => {
    const body = { ...(extra ?? {}) };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) body[key] = value;
    }
    const result = await theirstackPost("/v1/jobs/search", body);
    if (result.isError) return result;

    let data;
    try {
      data = JSON.parse(result.content[0].text);
    } catch {
      return result;
    }

    const allJobs = data.data ?? [];
    const jobs = allJobs.filter((j) => {
      const exp = evaluateExperience(
        { title: j.job_title, description: j.description, structuredSeniorityLabel: j.seniority },
        maxYearsExperience,
        excludeSeniorTitles
      );
      j.detected_min_years_experience = exp.detected_min_years_experience;
      j.looks_senior = exp.looks_senior;
      return !exp.exclude;
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ...data, data: jobs, filtered_out_count: allJobs.length - jobs.length }, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "search_companies",
  {
    title: "Search TheirStack companies",
    description:
      "Search companies by technographics, hiring signals, size, funding, and industry via TheirStack. " +
      "Use blur_company_data=true to preview a query without consuming credits.",
    inputSchema: {
      company_name_or: stringArray(),
      company_name_partial_match_or: stringArray(),
      company_domain_or: stringArray(),
      company_country_code_or: stringArray(),
      industry_or: stringArray(),
      min_employee_count: z.number().int().optional(),
      max_employee_count: z.number().int().optional(),
      min_revenue_usd: z.number().int().optional(),
      max_revenue_usd: z.number().int().optional(),
      funding_stage_or: stringArray(),
      company_technology_slug_or: stringArray().describe("Only companies that mention these technologies in their jobs"),
      only_yc_companies: z.boolean().optional(),
      blur_company_data: z.boolean().optional().describe("Preview mode: no credits consumed"),
      page: z.number().int().optional(),
      limit: z.number().int().optional(),
      include_total_results: z.boolean().optional(),
      extra: extraFilters(),
    },
  },
  async ({ extra, ...rest }) => {
    const body = { ...(extra ?? {}) };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) body[key] = value;
    }
    return theirstackPost("/v1/companies/search", body);
  }
);

server.registerTool(
  "company_technologies",
  {
    title: "Get a company's tech stack (technographics)",
    description:
      "List the technologies a company uses, with confidence level and first/last-seen dates. " +
      "Requires exactly one of company_domain, company_name, or company_linkedin_url. " +
      "Costs 3 API credits per lookup (0 if no data is found).",
    inputSchema: {
      company_domain: z.string().optional(),
      company_name: z.string().optional(),
      company_linkedin_url: z.string().optional(),
      technology_category_slug_or: stringArray().describe("Restrict to technologies in these categories, e.g. relational-databases"),
      keyword_category_slug_or: stringArray(),
    },
  },
  async (args) => {
    const body = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) body[key] = value;
    }
    return theirstackPost("/v1/companies/technologies", body);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
