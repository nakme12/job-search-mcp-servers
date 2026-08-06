import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "remoteok-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search RemoteOK job listings",
    description:
      "Search RemoteOK's public free job feed (no key needed). Filters are applied client-side after fetching " +
      "the feed, since the API doesn't support query params. RemoteOK's terms ask that any product built on this " +
      "data link back to remoteok.com as the source.\n" +
      "IMPORTANT: prefer `keywords` (matches the job title) over `tags`. RemoteOK's tags are SEO-stuffed - " +
      "unrelated listings routinely carry 40+ tags including 'react', 'java', 'golang', so tag-only filtering " +
      "returns false positives. The live feed is also small (~100 postings at a time), so expect few results.",
    inputSchema: {
      keywords: z.array(z.string()).optional().describe("Match against job position/title (case-insensitive substring). Most reliable filter."),
      tags: z.array(z.string()).optional().describe("Match against job tags - unreliable, see note above; best combined with `keywords`"),
      minSalary: z.number().optional().describe("Minimum salary_min, in USD"),
      limit: z.number().int().min(1).max(200).default(30),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): RemoteOK has no structured " +
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
        .describe("Client-side safety net against `date`. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as an internship/traineeship."),
    },
  },
  async ({ keywords, tags, minSalary, limit, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    const response = await fetch("https://remoteok.com/api", {
      headers: { "user-agent": "job-search-mcp (https://github.com/nakme12/job-search-mcp-servers)" },
    });

    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `RemoteOK request failed: HTTP ${response.status}` }] };
    }

    const data = await response.json();
    // First element is a legal/ToS notice, not a job
    let jobs = data.filter((j) => j.id);

    if (keywords?.length) {
      const needles = keywords.map((k) => k.toLowerCase());
      jobs = jobs.filter((j) => needles.some((n) => (j.position ?? "").toLowerCase().includes(n)));
    }
    if (tags?.length) {
      const needles = tags.map((t) => t.toLowerCase());
      jobs = jobs.filter((j) => (j.tags ?? []).some((t) => needles.includes(t.toLowerCase())));
    }
    if (minSalary !== undefined) {
      jobs = jobs.filter((j) => (j.salary_min ?? 0) >= minSalary);
    }

    const beforeCount = jobs.length;
    jobs = jobs.filter((j) => {
      const exp = evaluateExperience({ title: j.position, description: j.description }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness({ title: j.position, postedDate: j.date }, maxAgeDays, excludeInternships);
      j.detected_min_years_experience = exp.detected_min_years_experience;
      j.looks_senior = exp.looks_senior;
      j.is_internship = fresh.is_internship;
      j.age_days = fresh.age_days;
      return !exp.exclude && !fresh.exclude;
    });

    jobs = jobs.slice(0, limit);

    return {
      content: [
        { type: "text", text: JSON.stringify({ count: jobs.length, filtered_out_count: beforeCount - jobs.length, jobs }, null, 2) },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
