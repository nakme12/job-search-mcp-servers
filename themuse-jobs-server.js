import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";

// Optional: set THEMUSE_API_KEY to raise the rate limit from 500/hr to 3600/hr.
// Free at https://www.themuse.com/developers/api/v2 -- works fine without one too.
const API_KEY = process.env.THEMUSE_API_KEY;

const server = new McpServer({
  name: "themuse-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search The Muse job listings",
    description:
      "Search The Muse's official public jobs API. Works without a key (500 req/hr) or with a free " +
      "THEMUSE_API_KEY env var for a higher limit (3600 req/hr).",
    inputSchema: {
      page: z.number().int().min(0).default(0),
      category: z
        .array(z.string())
        .optional()
        .describe(
          "Must match The Muse's exact category names, e.g. ['Software Engineering'], ['Data and Analytics'], " +
            "['Science and Engineering'], ['Design']. Fetch a page with no filters first if unsure of exact values."
        ),
      level: z.array(z.string()).optional().describe("e.g. ['Entry Level','Mid Level','Senior Level']"),
      location: z.array(z.string()).optional().describe("e.g. ['Remote','New York, NY']"),
      company: z.array(z.string()).optional(),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo), applied after fetching: " +
            "cross-checks each job's `levels` field and description text. Not passed to `level` above server-side, " +
            "since combining The Muse's own `level` + `category` filters has been observed to return irrelevant " +
            "results (a live bug on their end). Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description/level reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
    },
  },
  async ({ page, category, level, location, company, maxYearsExperience, excludeSeniorTitles }) => {
    const url = new URL("https://www.themuse.com/api/public/jobs");
    url.searchParams.set("page", String(page));
    if (API_KEY) url.searchParams.set("api_key", API_KEY);
    for (const c of category ?? []) url.searchParams.append("category", c);
    for (const l of level ?? []) url.searchParams.append("level", l);
    for (const loc of location ?? []) url.searchParams.append("location", loc);
    for (const co of company ?? []) url.searchParams.append("company", co);

    const response = await fetch(url);
    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `The Muse request failed: HTTP ${response.status}` }] };
    }

    const data = await response.json();
    const allResults = data.results ?? [];
    const results = allResults.filter((j) => {
      const exp = evaluateExperience(
        {
          title: j.name,
          description: j.contents,
          structuredSeniorityLabel: j.levels?.[0]?.name,
        },
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
          text: JSON.stringify(
            { total: data.total, page_count: data.page_count, filtered_out_count: allResults.length - results.length, results },
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
