import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "hackernews-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Hacker News Who Is Hiring monthly developer threads",
    description:
      "Fetches directly from Y Combinator Hacker News official monthly 'Ask HN: Who is hiring?' threads, parses top-level employer comments, and filters for 0-2 YOE Frontend/React roles.",
    inputSchema: {
      query: z.string().default("React").describe("Search query e.g. React, Frontend, Full Stack"),
      maxYearsExperience: z.number().default(2),
      excludeSeniorTitles: z.boolean().default(true),
      excludeInternships: z.boolean().default(true),
      maxAgeDays: z.number().default(90),
    },
  },
  async ({ query, maxYearsExperience, excludeSeniorTitles, excludeInternships, maxAgeDays }) => {
    try {
      // 1. Get latest monthly 'Ask HN: Who is hiring?' post
      const threadRes = await fetch(
        "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=2"
      );
      if (!threadRes.ok) {
        return { isError: true, content: [{ type: "text", text: `HN Algolia API error: HTTP ${threadRes.status}` }] };
      }
      const threadData = await threadRes.json();
      const hiringStory = (threadData.hits || []).find((h) => h.title && h.title.includes("Who is hiring"));
      if (!hiringStory) {
        return { isError: true, content: [{ type: "text", text: "No active 'Ask HN: Who is hiring?' thread found." }] };
      }

      // 2. Query comments within this story matching the developer keyword
      const commentsRes = await fetch(
        `https://hn.algolia.com/api/v1/search?tags=comment,story_${hiringStory.objectID}&query=${encodeURIComponent(
          query
        )}&hitsPerPage=50`
      );
      if (!commentsRes.ok) {
        return { isError: true, content: [{ type: "text", text: `HN Comments fetch error: HTTP ${commentsRes.status}` }] };
      }
      const commentsData = await commentsRes.json();
      const hits = commentsData.hits || [];

      let filteredOutCount = 0;
      const results = [];

      for (const c of hits) {
        const rawHtml = c.comment_text || "";
        const cleanText = rawHtml
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#x2F;/g, "/")
          .replace(/&#x27;/g, "'");

        // Parse first line for Title / Company
        const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);
        const headline = lines[0] || "Hacker News Hiring Post";

        const exp = evaluateExperience(cleanText, headline, {
          maxYearsExperience,
          excludeSeniorTitles,
          excludeInternships,
        });
        if (!exp.pass) {
          filteredOutCount++;
          continue;
        }

        const postDate = c.created_at;
        const fresh = evaluateFreshness(postDate, { maxAgeDays });
        if (!fresh.pass) {
          filteredOutCount++;
          continue;
        }

        results.push({
          title: headline,
          company: c.author,
          thread: hiringStory.title,
          url: `https://news.ycombinator.com/item?id=${c.objectID}`,
          date_posted: postDate,
          age_days: fresh.ageDays,
          detected_min_years_experience: exp.detectedYears,
          looks_senior: exp.looksSenior,
          is_internship: exp.isInternship,
          summary: cleanText.substring(0, 300) + "...",
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                source: "hackernews_who_is_hiring",
                thread: hiringStory.title,
                total_hits_before_filter: hits.length,
                filtered_out_count: filteredOutCount,
                results_count: results.length,
                jobs: results,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error fetching HN jobs: ${err.message}` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
