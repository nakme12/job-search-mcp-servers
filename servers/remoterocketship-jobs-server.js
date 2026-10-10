import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchRemoteRocketshipJobs } from "./remoterocketship-core.js";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_API_TOKEN) {
  console.error(
    "Missing APIFY_API_TOKEN env var. Set it in your MCP client config's env block."
  );
  process.exit(1);
}

const server = new McpServer({
  name: "remoterocketship-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Remote Rocketship job listings (Apify)",
    description:
      "Search remoterocketship.com via a third-party Apify scraper actor (Remote Rocketship has no official " +
      "public API). NOTE: unlike this repo's other Apify integration (career-site-jobs, billed per-result), " +
      "this actor is billed as a RECURRING MONTHLY SUBSCRIPTION (~$19.89/mo + platform usage) regardless of " +
      "call volume - confirm the subscription is active before relying on this tool. Field names in the " +
      "response are best-effort guesses (see remoterocketship-core.js) pending a verified live sample.",
    inputSchema: {
      jobTitle: z.string().optional().describe("Job title keywords, e.g. 'Frontend Developer'"),
      page: z.number().int().min(1).default(1),
      sort: z.string().default("DateAdded"),
      maxitems: z.number().int().min(1).max(200).default(30).describe("Max jobs to collect from the actor"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): regex-scans title/description " +
            "and drops jobs implying more years than this. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side filter against the posted date. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as an internship/traineeship."),
    },
  },
  async (args) => {
    try {
      const data = await searchRemoteRocketshipJobs(args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: err.message }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
