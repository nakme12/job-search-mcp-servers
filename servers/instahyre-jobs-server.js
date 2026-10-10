import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const API_URL = "https://www.instahyre.com/api/v1/job_search/";
// Instahyre's own page size is fixed server-side at 35 regardless of any
// `limit` value passed in the query string - pagination only works via `offset`.
const PAGE_SIZE = 35;
const MAX_PAGES_PER_CALL = 12; // safety net: at most 420 raw jobs fetched per tool call

// Confirmed by probing (undocumented API, no official docs exist):
// - `keyword`/`title`/`q`/`location`/`locations` are all silently ignored server-side
//   (total_count doesn't change) - only client-side title matching actually narrows by role.
// - `job_functions` (int id), `experience_level` (string enum), and `company_size`
//   (int id) are genuine server-side filters.
// - The API exposes NO posting date and NO job description anywhere (list or detail
//   endpoint) - only title, location, employer, and keyword tags. So `age_days` can
//   never be computed for this source; freshness-filter.js is still applied for its
//   internship-title check, but every job's age_days will be null and the maxAgeDays
//   cutoff is a no-op here. Documented rather than faked - see AGENTS.md rule 5.
const JOB_FUNCTIONS = {
  3: "Frontend Development",
  1: "Full-Stack Development",
  10: "Backend Development",
  9: "Data Science / Machine Learning",
  76: "Other Software Development",
};

const server = new McpServer({
  name: "instahyre-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search Instahyre jobs",
    description:
      "Search job listings from Instahyre's public (undocumented, unauthenticated) job-search JSON API. " +
      "IMPORTANT LIMITATION: this source provides no posting date and no job description anywhere - only " +
      "title, location, employer, and keyword tags. `age_days`/freshness cannot be computed for these results " +
      "(always null); only the internship-title check from the freshness filter applies. Free-text keyword/" +
      "title/location query params are silently ignored server-side by Instahyre itself - only job_functions, " +
      "experience_level, and company_size genuinely filter server-side, so this tool also applies client-side " +
      "title matching via `titleContains`.",
    inputSchema: {
      titleContains: z
        .array(z.string())
        .optional()
        .describe(
          "Case-insensitive substrings to match against job title client-side, e.g. ['frontend','react','ui developer']. " +
            "Required in practice - Instahyre's own keyword/title params don't filter server-side."
        ),
      jobFunctions: z
        .array(z.number().int())
        .default([3, 1])
        .describe(
          `Instahyre job_function ids (server-side filter). Known ids: ${JSON.stringify(JOB_FUNCTIONS)}. ` +
            "Defaults to Frontend Development + Full-Stack Development."
        ),
      experienceLevels: z
        .array(z.enum(["internship", "entry_level", "associate", "mid_senior", "senior"]))
        .default(["entry_level", "associate"])
        .describe(
          "Instahyre's own experience buckets (server-side filter). Defaults to entry_level + associate as the " +
            "closest available match to a 0-2yr candidate - these are Instahyre's own category labels, not a " +
            "computed year count, since the API never exposes numeric years-of-experience per job."
        ),
      companySize: z
        .array(z.number().int())
        .optional()
        .describe("Instahyre company_size bucket ids (server-side filter). Exact id meanings unconfirmed - pass through as-is."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(420)
        .default(35)
        .describe(
          "Max jobs to return after filtering. Instahyre's page size is fixed at 35 server-side regardless of " +
            "this value - the tool paginates via `offset` internally (up to 12 pages/420 raw jobs) to satisfy it."
        ),
      offset: z.number().int().min(0).default(0).describe("Starting offset into Instahyre's result set, for pagination across calls"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): regex-scans title only " +
            "(no description available from this source) and drops jobs implying more years than this. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as an internship/traineeship."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe(
          "No-op for this source: Instahyre exposes no posting date anywhere, so age_days is always null and " +
            "nothing is ever excluded on staleness. Kept only for interface consistency with every other server in this repo."
        ),
    },
  },
  async ({
    titleContains,
    jobFunctions,
    experienceLevels,
    companySize,
    limit,
    offset,
    maxYearsExperience,
    excludeSeniorTitles,
    excludeInternships,
    maxAgeDays,
  }) => {
    const titleRegexes = (titleContains || []).map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

    const kept = [];
    let filteredOutCount = 0;
    let sourceTotalCount = null;
    let cursor = offset;

    for (let page = 0; page < MAX_PAGES_PER_CALL && kept.length < limit; page++) {
      const params = new URLSearchParams();
      params.set("offset", String(cursor));
      for (const id of jobFunctions) params.append("job_functions", String(id));
      for (const lvl of experienceLevels) params.append("experience_level", lvl);
      for (const cs of companySize || []) params.append("company_size", String(cs));

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Request failed: HTTP ${response.status}` }],
        };
      }

      const json = await response.json();
      sourceTotalCount = json.meta?.total_count ?? sourceTotalCount;
      const objects = json.objects ?? [];

      for (const job of objects) {
        const title = job.title || job.candidate_title || "";
        if (titleRegexes.length && !titleRegexes.some((re) => re.test(title))) continue;

        const exp = evaluateExperience({ title, description: null }, maxYearsExperience, excludeSeniorTitles);
        const fresh = evaluateFreshness({ title, employmentType: null, postedDate: null }, maxAgeDays, excludeInternships);
        const exclude = exp.exclude || fresh.exclude;

        if (exclude) {
          filteredOutCount += 1;
          continue;
        }

        kept.push({
          id: job.id,
          title,
          company: job.employer?.company_name ?? null,
          company_tagline: job.employer?.company_tagline ?? null,
          locations: job.locations ?? null,
          keywords: job.keywords ?? [],
          url: job.public_url,
          detected_min_years_experience: exp.detected_min_years_experience,
          looks_senior: exp.looks_senior,
          is_internship: fresh.is_internship,
          age_days: null,
        });

        if (kept.length >= limit) break;
      }

      cursor += PAGE_SIZE;
      if (!json.meta?.next) break;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              note: "This source provides no posting date or description - age_days is always null and freshness cannot be enforced beyond dropping internship titles.",
              source_total_count: sourceTotalCount,
              next_offset: cursor,
              filtered_out_count: filteredOutCount,
              jobs: kept,
            },
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
