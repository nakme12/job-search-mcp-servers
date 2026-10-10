import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "ashby-jobs",
  version: "1.0.0",
});

server.registerTool(
  "get_company_jobs",
  {
    title: "Get a company's Ashby job board",
    description:
      "Fetch open job postings for a specific company that uses Ashby as its ATS, via Ashby's public, " +
      "unauthenticated job board API. No key needed. This only works for ONE company at a time (there is " +
      "no cross-company search) - you need the company's Ashby slug, which is the last part of their " +
      "careers page URL, e.g. https://jobs.ashbyhq.com/notion -> slug is 'notion'. " +
      "Optional filters below are applied client-side after fetching, since Ashby's API doesn't support " +
      "server-side filtering.",
    inputSchema: {
      companySlug: z.string().describe("The company's Ashby slug, e.g. 'notion' from jobs.ashbyhq.com/notion"),
      titleContains: z.string().optional().describe("Case-insensitive substring to match against job title"),
      locationContains: z.string().optional().describe("Case-insensitive substring to match against job location"),
      department: z.string().optional().describe("Case-insensitive exact match against department"),
      includeCompensation: z.boolean().default(true),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): Ashby has no structured " +
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
        .describe("Client-side safety net against `publishedAt`. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/employmentType reads as an internship/traineeship."),
    },
  },
  async ({
    companySlug,
    titleContains,
    locationContains,
    department,
    includeCompensation,
    maxYearsExperience,
    excludeSeniorTitles,
    maxAgeDays,
    excludeInternships,
  }) => {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companySlug)}?includeCompensation=${includeCompensation}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Ashby request failed: HTTP ${response.status} - ${text}. Check that '${companySlug}' is the correct Ashby slug (from jobs.ashbyhq.com/<slug>).`,
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
      jobs = jobs.filter((j) => (j.location ?? "").toLowerCase().includes(needle));
    }
    if (department) {
      const needle = department.toLowerCase();
      jobs = jobs.filter((j) => (j.department ?? "").toLowerCase() === needle);
    }

    const beforeCount = jobs.length;
    jobs = jobs.filter((j) => {
      const description = j.descriptionPlain ?? j.descriptionHtml ?? j.description ?? "";
      const exp = evaluateExperience({ title: j.title, description }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness(
        { title: j.title, employmentType: j.employmentType, postedDate: j.publishedAt },
        maxAgeDays,
        excludeInternships
      );
      j.detected_min_years_experience = exp.detected_min_years_experience;
      j.looks_senior = exp.looks_senior;
      j.is_internship = fresh.is_internship;
      j.age_days = fresh.age_days;
      return !exp.exclude && !fresh.exclude;
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { companySlug, count: jobs.length, filtered_out_count: beforeCount - jobs.length, jobs },
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
