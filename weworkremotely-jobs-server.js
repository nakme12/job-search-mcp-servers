import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

// Public RSS feeds - no key, no auth, no login. Confirmed live via curl (200 OK for
// each slug below) before wiring this up.
const CATEGORY_SLUGS = {
  "front-end": "remote-front-end-programming-jobs",
  "full-stack": "remote-full-stack-programming-jobs",
  "back-end": "remote-back-end-programming-jobs",
  programming: "remote-programming-jobs",
  devops: "remote-devops-sysadmin-jobs",
  all: "remote-jobs", // the unfiltered firehose, every category
};

const FEED_BASE = "https://weworkremotely.com";

const ENTITY_MAP = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
function decodeEntities(s) {
  return (s || "").replace(/&(#39|amp|lt|gt|quot|nbsp);/g, (_, e) => ENTITY_MAP[e]);
}

function stripHtml(html) {
  return decodeEntities((html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function field(itemXml, tag) {
  const m = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeEntities(m[1].trim()) : null;
}

// Minimal regex-based RSS parser - no XML library dependency in this repo, and WWR's
// feed is flat enough (no nested <item>-like tags) that this is reliable.
function parseRssItems(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const chunk = m[1];
    items.push({
      title: field(chunk, "title"),
      region: field(chunk, "region"),
      category: field(chunk, "category"),
      employmentType: field(chunk, "type"),
      descriptionHtml: field(chunk, "description"),
      pubDate: field(chunk, "pubDate"),
      url: field(chunk, "link") || field(chunk, "guid"),
    });
  }
  return items;
}

const server = new McpServer({
  name: "weworkremotely-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search We Work Remotely jobs",
    description:
      "Search We Work Remotely's public RSS job feeds (weworkremotely.com) - no key needed, per WWR's own " +
      "publicly published feeds. WWR's own category tagging is noisy (non-programming roles occasionally show " +
      "up in the Front-End Programming feed), so pass `titleContains` to narrow by role name for reliable results.",
    inputSchema: {
      categories: z
        .array(z.enum(Object.keys(CATEGORY_SLUGS)))
        .default(["front-end", "full-stack"])
        .describe(`Which WWR category feeds to pull from and merge. Options: ${Object.keys(CATEGORY_SLUGS).join(", ")}.`),
      titleContains: z
        .array(z.string())
        .optional()
        .describe("Case-insensitive substrings to match against job title, e.g. ['frontend','react','javascript']"),
      limit: z.number().int().min(1).max(100).default(30).describe("Max jobs to return after filtering, across all requested categories"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): WWR has no structured " +
            "experience field, so this regex-scans title/description and drops jobs implying more years than this. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side safety net against the feed's own pubDate. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/type reads as an internship/traineeship."),
    },
  },
  async ({ categories, titleContains, limit, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    const titleRegexes = (titleContains || []).map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

    const seen = new Set();
    const kept = [];
    let filteredOutCount = 0;

    for (const cat of categories) {
      const slug = CATEGORY_SLUGS[cat];
      const response = await fetch(`${FEED_BASE}/categories/${slug}.rss`, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; job-search-mcp/1.0)" },
      });
      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Request failed for category '${cat}': HTTP ${response.status}` }],
        };
      }
      const xml = await response.text();
      const items = cat === "all" ? parseRssItems(xml) : parseRssItems(xml);

      for (const job of items) {
        if (!job.url || seen.has(job.url)) continue;
        seen.add(job.url);

        if (titleRegexes.length && !titleRegexes.some((re) => re.test(job.title || ""))) continue;

        const descriptionText = stripHtml(job.descriptionHtml);
        const exp = evaluateExperience({ title: job.title, description: descriptionText }, maxYearsExperience, excludeSeniorTitles);
        const fresh = evaluateFreshness(
          { title: job.title, employmentType: job.employmentType, postedDate: job.pubDate },
          maxAgeDays,
          excludeInternships
        );
        const exclude = exp.exclude || fresh.exclude;

        if (exclude) {
          filteredOutCount += 1;
          continue;
        }

        kept.push({
          title: job.title,
          category: job.category,
          region: job.region,
          employment_type: job.employmentType,
          url: job.url,
          description_excerpt: descriptionText.slice(0, 400),
          detected_min_years_experience: exp.detected_min_years_experience,
          looks_senior: exp.looks_senior,
          is_internship: fresh.is_internship,
          age_days: fresh.age_days,
        });
      }
    }

    kept.sort((a, b) => (a.age_days ?? 9999) - (b.age_days ?? 9999));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { filtered_out_count: filteredOutCount, jobs: kept.slice(0, limit) },
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
