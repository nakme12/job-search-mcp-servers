import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const BASE_URL = "https://developer-hub-server-fypd.onrender.com/api/v1/website/jobs";

const server = new McpServer({
  name: "developerhub-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Developer Hub job listings",
    description:
      "Search Developer Hub's live job listings API (devjobs.smtechpartner.com / @merntech). " +
      "Provides direct recruiter emails, phone numbers, and apply links for verified developer jobs across India and Indore.",
    inputSchema: {
      page: z.number().int().min(1).default(1).describe("Page number, default 1"),
      limit: z.number().int().min(1).max(100).default(50).describe("Max results per page (1-100), default 50"),
      city: z.string().optional().describe("Filter by city, e.g. 'Indore', 'Bengaluru', 'Remote'"),
      query: z.string().optional().describe("Search term matching role, company, or skills (e.g. 'React', 'Frontend', 'MERN')"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe("Client-side safety net (defaults to 2 YOE). Set high (e.g. 99) to disable."),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side safety net against posting date. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as an internship or unpaid trainee program."),
    },
  },
  async ({ page, limit, city, query, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    try {
      const url = new URL(BASE_URL);
      url.searchParams.set("sort", "newest");
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));
      if (city) url.searchParams.set("city", city);

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JobSearchEngine/2.0",
        },
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Developer Hub API error: HTTP ${response.status} - ${await response.text()}` }],
        };
      }

      const json = await response.json();
      const items = (json.data && Array.isArray(json.data.items)) ? json.data.items : [];
      const totalAvailable = json.data ? json.data.total : items.length;

      let filteredOutCount = 0;
      const matchedJobs = [];

      for (const item of items) {
        const title = item.role || item.title || "";
        const company = item.company || "Tech Company";
        const location = item.location || "India / Remote";
        const skills = Array.isArray(item.skills) ? item.skills.join(", ") : (item.skills || "");
        const description = `${item.description || ""} ${skills} Experience: ${item.experience || ""}`.trim();
        const datePosted = item.createdAt || item.updatedAt || new Date().toISOString();

        // Optional query filter
        if (query) {
          const q = query.toLowerCase();
          const matches =
            title.toLowerCase().includes(q) ||
            company.toLowerCase().includes(q) ||
            skills.toLowerCase().includes(q) ||
            location.toLowerCase().includes(q);
          if (!matches) {
            filteredOutCount++;
            continue;
          }
        }

        // Apply shared freshness filter
        const freshness = evaluateFreshness(datePosted, maxAgeDays);
        if (freshness.exclude) {
          filteredOutCount++;
          continue;
        }

        // Apply shared experience filter
        const expEvaluation = evaluateExperience({ title, description }, maxYearsExperience, excludeSeniorTitles);

        // Check internship exclusion
        const isInternship = /\bintern(?:ship)?\b/i.test(title);
        if (excludeInternships && isInternship) {
          filteredOutCount++;
          continue;
        }

        if (expEvaluation.exclude) {
          filteredOutCount++;
          continue;
        }

        const applyUrl = item.apply_link || (item.email ? `mailto:${item.email}` : `https://devjobs.smtechpartner.com/`);

        matchedJobs.push({
          id: item._id,
          title,
          company,
          location,
          stated_experience: item.experience || "",
          email: item.email || null,
          phone: item.phone || null,
          apply_url: applyUrl,
          skills: item.skills || [],
          date_posted: datePosted,
          age_days: freshness.age_days,
          detected_min_years_experience: expEvaluation.detected_min_years_experience,
          looks_senior: expEvaluation.looks_senior,
          is_internship: isInternship,
        });
      }

      const result = {
        total_in_batch: items.length,
        total_matched: matchedJobs.length,
        filtered_out_count: filteredOutCount,
        total_portal_jobs: totalAvailable,
        jobs: matchedJobs,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching Developer Hub jobs: ${err.message}` }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("developerhub-jobs server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
