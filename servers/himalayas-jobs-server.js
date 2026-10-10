import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "himalayas-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Himalayas remote job listings",
    description:
      "Search Himalayas' free public remote-jobs API (https://himalayas.app/jobs/api/search). No key needed, " +
      "no signup. Supports real server-side filters (q, country, seniority, employment_type, company). Data is " +
      "cached and refreshed roughly every 24h on Himalayas' end, so there's no benefit to polling more than once " +
      "a day. Every listing is remote-eligible by nature of the source.",
    inputSchema: {
      q: z.string().optional().describe("Free-text keyword search, e.g. 'frontend react'"),
      country: z.string().optional().describe("Country a candidate must be eligible to work from, e.g. 'India'"),
      worldwide: z.boolean().optional().describe("Only jobs open worldwide (no country restriction)"),
      seniority: z.string().optional().describe("Himalayas' own label, e.g. 'Entry-level', 'Mid-level', 'Senior', 'Lead'"),
      employment_type: z.string().optional().describe("e.g. 'Full Time', 'Part Time', 'Contract', 'Intern'"),
      company: z.string().optional().describe("Company slug, e.g. 'linear'"),
      sort: z.string().optional().describe("Sort order, e.g. 'recent'"),
      page: z.number().int().min(1).optional().describe("1-based pagination"),
      limit: z.number().int().min(1).max(100).optional().describe("Max results to return after client-side filtering (source pages at ~20/request)"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): Himalayas has no numeric " +
            "YOE field, only a seniority label - this regex-scans title/description and cross-checks against " +
            "`seniority`. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description/seniority label reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side safety net against `pubDate`. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/employmentType reads as an internship/traineeship."),
    },
  },
  async ({
    q,
    country,
    worldwide,
    seniority,
    employment_type,
    company,
    sort,
    page,
    limit,
    maxYearsExperience,
    excludeSeniorTitles,
    maxAgeDays,
    excludeInternships,
  }) => {
    const url = new URL("https://himalayas.app/jobs/api/search");
    if (q) url.searchParams.set("q", q);
    if (country) url.searchParams.set("country", country);
    if (worldwide !== undefined) url.searchParams.set("worldwide", String(worldwide));
    if (seniority) url.searchParams.set("seniority", seniority);
    if (employment_type) url.searchParams.set("employment_type", employment_type);
    if (company) url.searchParams.set("company", company);
    if (sort) url.searchParams.set("sort", sort);
    if (page) url.searchParams.set("page", String(page));

    const response = await fetch(url, { headers: { "User-Agent": "job-search-mcp/1.0" } });
    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `Himalayas request failed: HTTP ${response.status}` }] };
    }

    const data = await response.json();
    let jobs = data.jobs ?? [];

    const beforeCount = jobs.length;
    jobs = jobs.filter((j) => {
      const exp = evaluateExperience(
        {
          title: j.title,
          description: j.excerpt || j.description,
          structuredSeniorityLabel: (j.seniority || []).join(" "),
        },
        maxYearsExperience,
        excludeSeniorTitles
      );
      const fresh = evaluateFreshness(
        { title: j.title, employmentType: j.employmentType, postedDate: j.pubDate ? j.pubDate * 1000 : null },
        maxAgeDays,
        excludeInternships
      );
      j.detected_min_years_experience = exp.detected_min_years_experience;
      j.looks_senior = exp.looks_senior;
      j.is_internship = fresh.is_internship;
      j.age_days = fresh.age_days;
      j.apply_url = j.applicationLink || j.guid;
      return !exp.exclude && !fresh.exclude;
    });

    if (limit) jobs = jobs.slice(0, limit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { jobCount: jobs.length, totalCount: data.totalCount ?? null, filtered_out_count: beforeCount - jobs.length, jobs },
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
