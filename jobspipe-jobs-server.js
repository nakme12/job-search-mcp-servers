import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";

const API_KEY = process.env.JOBSPIPE_API_KEY;
if (!API_KEY) {
  console.error("Missing JOBSPIPE_API_KEY env var. Set it in your MCP client config's env block.");
  process.exit(1);
}

const BASE = "https://api.jobspipe.dev";

const stringArray = () => z.array(z.string()).optional();

const server = new McpServer({
  name: "jobspipe-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search JobsPipe job listings",
    description:
      "Search live job postings normalized from 30+ ATS feeds and job boards (LinkedIn, Indeed, YCombinator, and more) " +
      "via JobsPipe. All filters combine with AND; array filters ending in _or match any of their values. " +
      "Each call costs 1 credit from your monthly quota (Free plan: 25 results/page, 100 credits/month).",
    inputSchema: {
      job_title_or: stringArray().describe("Match jobs whose title contains any of these"),
      job_title_not: stringArray().describe("Exclude jobs whose title contains any of these"),
      description_or: stringArray().describe("Match jobs whose description contains any of these phrases"),
      description_not: stringArray(),
      job_country_code_or: stringArray().describe("ISO alpha-2 country codes, e.g. US, GB"),
      job_country_code_not: stringArray(),
      job_location_or: stringArray().describe("City/region substrings, e.g. 'Seattle, WA'"),
      job_seniority_or: stringArray().describe("Seniority levels to match"),
      include_unlabeled_seniority: z
        .boolean()
        .optional()
        .describe("Also include jobs with no stated seniority (~55% of postings)"),
      skills_or: stringArray().describe("Skill slugs, e.g. python, kubernetes"),
      occupation_code_or: stringArray().describe("ISCO-08 occupation codes, e.g. 2512 or prefix 25"),
      isic_division_or: stringArray().describe("ISIC Rev.4 industry division codes, e.g. 62"),
      employment_type_or: z
        .array(z.enum(["full-time", "part-time", "contract", "temporary", "internship"]))
        .optional(),
      source_or: z.array(z.enum(["linkedin", "indeed", "ycombinator"])).optional(),
      company_name_partial_match_or: stringArray(),
      min_employee_count: z.number().int().optional(),
      max_employee_count: z.number().int().optional(),
      remote: z.boolean().optional().describe("true for remote-only, false to exclude remote"),
      posted_at_max_age_days: z.number().int().optional(),
      posted_at_gte: z.string().optional().describe("YYYY-MM-DD"),
      posted_at_lte: z.string().optional().describe("YYYY-MM-DD"),
      limit: z.number().int().optional().describe("Max results (capped by plan: 25 Free / 100 Builder / 500 Scale)"),
      include_total_results: z.boolean().optional(),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): drops jobs whose title/" +
            "description text or `seniority` field implies more years than this. Set high (e.g. 99) to disable. " +
            "`job_seniority_or` above is JobsPipe's own server-side filter - use both together or either alone."
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

    const response = await fetch(`${BASE}/v1/jobs/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `JobsPipe request failed: HTTP ${response.status} - ${text}` }] };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { content: [{ type: "text", text }] };
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

const transport = new StdioServerTransport();
await server.connect(transport);
