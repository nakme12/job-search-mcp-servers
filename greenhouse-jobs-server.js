import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "greenhouse-jobs",
  version: "1.0.0",
});

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

server.registerTool(
  "get_company_jobs",
  {
    title: "Get a company's Greenhouse job board",
    description:
      "Fetch open job postings for a specific company that uses Greenhouse as its ATS, via Greenhouse's public, " +
      "unauthenticated job board API. No key needed. Single company at a time (no cross-company search) - you " +
      "need the company's Greenhouse board token, which is usually the last part of their careers URL, e.g. " +
      "https://boards.greenhouse.io/stripe -> token is 'stripe' (also try job-boards.greenhouse.io/<token>). " +
      "Filters below are applied client-side after fetching, since Greenhouse's API doesn't support server-side filtering.",
    inputSchema: {
      boardToken: z.string().describe("The company's Greenhouse board token, e.g. 'stripe' from boards.greenhouse.io/stripe"),
      titleContains: z.string().optional().describe("Case-insensitive substring to match against job title"),
      locationContains: z.string().optional().describe("Case-insensitive substring to match against job location"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): Greenhouse has no " +
            "structured experience field, so this regex-scans title/description. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe(
          "Client-side safety net against `updated_at` (Greenhouse's public API doesn't expose original posted " +
            "date, so this is a proxy). Set high (e.g. 9999) to disable."
        ),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as an internship/traineeship."),
    },
  },
  async ({ boardToken, titleContains, locationContains, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Greenhouse request failed: HTTP ${response.status} - ${text}. Check that '${boardToken}' is the correct board token.`,
          },
        ],
      };
    }

    const data = await response.json();
    let jobs = data.jobs ?? [];

    if (titleContains) {
      const needle = titleContains.toLowerCase();
      jobs = jobs.filter((j) => (j.title ?? "").toLowerCase().includes(needle));
    }
    if (locationContains) {
      const needle = locationContains.toLowerCase();
      jobs = jobs.filter((j) => (j.location?.name ?? "").toLowerCase().includes(needle));
    }

    const beforeCount = jobs.length;
    jobs = jobs.map((j) => {
      const description = stripHtml(j.content);
      const exp = evaluateExperience({ title: j.title, description }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness({ title: j.title, postedDate: j.updated_at }, maxAgeDays, excludeInternships);
      return {
        title: j.title,
        location: j.location?.name,
        departments: (j.departments ?? []).map((d) => d.name),
        absolute_url: j.absolute_url,
        updated_at: j.updated_at,
        description,
        detected_min_years_experience: exp.detected_min_years_experience,
        looks_senior: exp.looks_senior,
        is_internship: fresh.is_internship,
        age_days: fresh.age_days,
        _exclude: exp.exclude || fresh.exclude,
      };
    });
    const kept = jobs.filter((j) => !j._exclude).map(({ _exclude, ...j }) => j);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { boardToken, count: kept.length, filtered_out_count: beforeCount - kept.length, jobs: kept },
            null,
            2
          ),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
