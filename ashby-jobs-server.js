import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
    },
  },
  async ({ companySlug, titleContains, locationContains, department, includeCompensation }) => {
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

    return {
      content: [{ type: "text", text: JSON.stringify({ companySlug, count: jobs.length, jobs }, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
