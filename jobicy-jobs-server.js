import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";

const BASE = "https://jobicy.com/api/v2/remote-jobs";

const server = new McpServer({
  name: "jobicy-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Jobicy remote job listings",
    description:
      "Search Jobicy's free public remote-jobs API. No key needed. Per Jobicy's terms: credit Jobicy as the " +
      "source and route apply buttons to the original job URL. " +
      "`geo` and `industry` need a predefined slug - call this tool with `discover: 'locations'` or " +
      "`discover: 'industries'` first to list valid values if unsure.",
    inputSchema: {
      count: z.number().int().min(1).max(50).optional().describe("Max results, default 50"),
      tag: z.string().optional().describe("Keyword/tag search, e.g. 'react'"),
      geo: z.string().optional().describe("A geoSlug from the locations list, e.g. 'apac'"),
      industry: z.string().optional().describe("An industrySlug from the industries list, e.g. 'dev'"),
      discover: z
        .enum(["locations", "industries"])
        .optional()
        .describe("Instead of searching jobs, list valid geo or industry slugs"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo), cross-checked against " +
            "Jobicy's own `jobLevel` field. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description/jobLevel reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
    },
  },
  async ({ count, tag, geo, industry, discover, maxYearsExperience, excludeSeniorTitles }) => {
    const url = new URL(BASE);
    if (discover) {
      url.searchParams.set("get", discover);
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) return { isError: true, content: [{ type: "text", text: `Jobicy request failed: HTTP ${response.status} - ${text}` }] };
      return { content: [{ type: "text", text }] };
    }

    if (count) url.searchParams.set("count", String(count));
    if (tag) url.searchParams.set("tag", tag);
    if (geo) url.searchParams.set("geo", geo);
    if (industry) url.searchParams.set("industry", industry);

    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `Jobicy request failed: HTTP ${response.status} - ${text}` }] };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { isError: true, content: [{ type: "text", text: `Failed to parse Jobicy response: ${text.slice(0, 300)}` }] };
    }
    if (data.success === false) {
      return { isError: true, content: [{ type: "text", text: `Jobicy error: ${data.error}` }] };
    }

    const allJobs = data.jobs ?? [];
    const jobs = allJobs.filter((j) => {
      const exp = evaluateExperience(
        { title: j.jobTitle, description: j.jobDescription, structuredSeniorityLabel: j.jobLevel },
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
          text: JSON.stringify({ jobCount: jobs.length, filtered_out_count: allJobs.length - jobs.length, jobs }, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
