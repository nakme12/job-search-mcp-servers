import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "ycombinator-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_yc_jobs",
  {
    title: "Search Y Combinator & Hacker News hiring posts",
    description:
      "Fetches live startup job listings from Hacker News 'Who is Hiring?' threads and YC Work at a Startup. " +
      "Filters strictly for 0-2 YOE Frontend, React, and Full Stack roles with experience & freshness safety nets.",
    inputSchema: {
      query: z.string().default("react").describe("Search keyword, e.g. 'react', 'frontend', 'nextjs'"),
      maxYearsExperience: z.number().default(2).describe("Drop jobs requiring more years than this."),
      excludeSeniorTitles: z.boolean().default(true).describe("Drop Senior/Lead/Staff/Manager roles."),
      maxAgeDays: z.number().default(30).describe("Max age in days."),
      excludeInternships: z.boolean().default(true).describe("Drop internships/unpaid roles.")
    },
  },
  async ({ query, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    try {
      const hnSearchUrl = `https://hn.algolia.com/api/v1/search_by_date?tags=comment,author_whoishiring&query=${encodeURIComponent(query)}&hitsPerPage=30`;
      const res = await fetch(hnSearchUrl);
      if (!res.ok) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Failed to fetch from HN API", status: res.status }) }] };
      }

      const data = await res.json();
      const hits = data.hits || [];
      const cleanJobs = [];
      let filteredOutCount = 0;

      for (const hit of hits) {
        const text = hit.comment_text || "";
        const title = text.split("<p>")[0].replace(/<[^>]+>/g, "").slice(0, 100);
        const createdAt = hit.created_at || "";

        const expEval = evaluateExperience({
          title: title,
          description: text,
          maxYearsExperience,
          excludeSeniorTitles,
          excludeInternships
        });

        const freshEval = evaluateFreshness({
          postedDate: createdAt,
          maxAgeDays
        });

        if (expEval.passes && freshEval.passes) {
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const linkMatch = text.match(/https?:\/\/[^\s"<]+/);

          cleanJobs.push({
            company: title.split("|")[0]?.trim() || "YC Startup",
            role: title,
            posted_date: createdAt.split("T")[0],
            age_days: freshEval.ageDays,
            detected_exp: expEval.detectedYears,
            contact_email: emailMatch ? emailMatch[0] : null,
            apply_url: linkMatch ? linkMatch[0] : `https://news.ycombinator.com/item?id=${hit.id}`,
            text_snippet: text.replace(/<[^>]+>/g, " ").slice(0, 300)
          });
        } else {
          filteredOutCount++;
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Hacker News & YC Who Is Hiring",
            total_hits: hits.length,
            filtered_out_count: filteredOutCount,
            results: cleanJobs
          }, null, 2)
        }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
