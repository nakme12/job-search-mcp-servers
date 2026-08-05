import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "remotive-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Remotive job listings",
    description:
      "Search Remotive's free public remote-jobs API. No key needed. Per Remotive's terms: keep requests " +
      "light (a few times a day, not repeated polling), and any listing shown to a user should link back " +
      "to the job's Remotive URL and credit Remotive as the source. " +
      "NOTE: Remotive's own `search`/`category`/`company_name` server-side filters have been observed " +
      "returning unfiltered results (a live API bug on their end) - this tool also re-filters client-side " +
      "as a safety net, but Remotive's total live job pool is small (dozens, not thousands) at any given time.",
    inputSchema: {
      search: z.string().optional().describe("Keyword search across title/description, e.g. 'react frontend'"),
      category: z.string().optional().describe("e.g. 'Software Development', 'Design', 'Writing'"),
      company_name: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ search, category, company_name, limit }) => {
    const url = new URL("https://remotive.com/api/remote-jobs");
    if (search) url.searchParams.set("search", search);
    if (category) url.searchParams.set("category", category);
    if (company_name) url.searchParams.set("company_name", company_name);
    if (limit) url.searchParams.set("limit", String(limit));

    const response = await fetch(url);
    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `Remotive request failed: HTTP ${response.status}` }] };
    }

    const data = await response.json();
    let jobs = data.jobs ?? [];

    // Remotive's server-side filters have been unreliable; re-apply client-side.
    if (search) {
      const needle = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          (j.title ?? "").toLowerCase().includes(needle) ||
          (j.description ?? "").toLowerCase().includes(needle) ||
          (j.tags ?? []).some((t) => t.toLowerCase().includes(needle))
      );
    }
    if (category) {
      const needle = category.toLowerCase();
      jobs = jobs.filter((j) => (j.category ?? "").toLowerCase() === needle);
    }
    if (company_name) {
      const needle = company_name.toLowerCase();
      jobs = jobs.filter((j) => (j.company_name ?? "").toLowerCase().includes(needle));
    }
    if (limit) jobs = jobs.slice(0, limit);

    return {
      content: [{ type: "text", text: JSON.stringify({ jobCount: jobs.length, jobs }, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
