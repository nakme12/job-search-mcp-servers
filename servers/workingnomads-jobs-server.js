import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "workingnomads-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search WorkingNomads remote job listings",
    description:
      "Fetches and filters live curated remote developer jobs from WorkingNomads official public API.",
    inputSchema: {
      category: z.string().default("development").describe("Category, e.g. development"),
      keywords: z.string().optional().describe("Filter keywords e.g. 'React', 'Frontend'"),
      maxYearsExperience: z.number().default(2),
      excludeSeniorTitles: z.boolean().default(true),
      excludeInternships: z.boolean().default(true),
      maxAgeDays: z.number().default(90),
    },
  },
  async ({ category, keywords, maxYearsExperience, excludeSeniorTitles, excludeInternships, maxAgeDays }) => {
    try {
      const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/");
      if (!res.ok) {
        return { isError: true, content: [{ type: "text", text: `WorkingNomads API error: HTTP ${res.status}` }] };
      }
      const data = await res.json();
      let jobs = Array.isArray(data) ? data : [];

      if (category) {
        jobs = jobs.filter((j) => (j.category_name || "").toLowerCase().includes(category.toLowerCase()));
      }

      if (keywords) {
        const kw = keywords.toLowerCase();
        jobs = jobs.filter(
          (j) =>
            (j.title || "").toLowerCase().includes(kw) ||
            (j.description || "").toLowerCase().includes(kw) ||
            (j.tags || "").toLowerCase().includes(kw)
        );
      }

      let filteredOutCount = 0;
      const results = [];

      for (const j of jobs) {
        const exp = evaluateExperience(
          { title: j.title, description: (j.description || "") + " " + (j.tags || "") },
          maxYearsExperience,
          excludeSeniorTitles
        );
        if (exp.exclude) {
          filteredOutCount++;
          continue;
        }

        const fresh = evaluateFreshness(
          { title: j.title, postedDate: j.pub_date },
          maxAgeDays,
          excludeInternships
        );
        if (fresh.exclude) {
          filteredOutCount++;
          continue;
        }

        results.push({
          title: j.title,
          company: j.company_name,
          location: j.location || "Remote",
          url: j.url,
          date_posted: j.pub_date,
          age_days: fresh.age_days,
          detected_min_years_experience: exp.detected_min_years_experience,
          looks_senior: exp.looks_senior,
          is_internship: fresh.is_internship,
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                source: "workingnomads",
                total_found_before_filter: jobs.length,
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
      return { isError: true, content: [{ type: "text", text: `Error fetching WorkingNomads jobs: ${err.message}` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
