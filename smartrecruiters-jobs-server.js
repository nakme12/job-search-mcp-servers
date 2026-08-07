import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const BASE = "https://api.smartrecruiters.com/v1";

const server = new McpServer({
  name: "smartrecruiters-jobs",
  version: "1.0.0",
});

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

server.registerTool(
  "get_company_jobs",
  {
    title: "Get a company's SmartRecruiters job board",
    description:
      "Fetch open job postings for a specific company that uses SmartRecruiters as its ATS, via their public, " +
      "unauthenticated postings API. No key needed. Single company at a time (no cross-company search) - you " +
      "need the company's SmartRecruiters identifier, the last part of their careers URL, e.g. " +
      "https://jobs.smartrecruiters.com/Nagarro1 -> identifier is 'Nagarro1'. " +
      "NOTE: this list endpoint does NOT include full job descriptions (SmartRecruiters only returns those per-job), " +
      "so experience/freshness filtering here is title-only and less reliable than other servers in this repo - " +
      "call get_job_details on a specific result if you need the full description for deeper filtering.",
    inputSchema: {
      companyIdentifier: z.string().describe("The company's SmartRecruiters identifier, e.g. 'Nagarro1'"),
      q: z.string().optional().describe("Server-side keyword search, e.g. 'react' or 'frontend' - much cheaper than paging blindly through a large board"),
      titleContains: z.string().optional().describe("Additional client-side: case-insensitive substring against job title"),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net, title-only (see note above about missing descriptions at list level). " +
            "Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side safety net against `releasedDate`. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/employment type reads as an internship/traineeship."),
    },
  },
  async ({ companyIdentifier, q, titleContains, limit, offset, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    const url = new URL(`${BASE}/companies/${encodeURIComponent(companyIdentifier)}/postings`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    if (q) url.searchParams.set("q", q);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `SmartRecruiters request failed: HTTP ${response.status} - ${text}. Check that '${companyIdentifier}' is the correct identifier.`,
          },
        ],
      };
    }

    const data = await response.json();
    let jobs = data.content ?? [];

    if (titleContains) {
      const needle = titleContains.toLowerCase();
      jobs = jobs.filter((j) => (j.name ?? "").toLowerCase().includes(needle));
    }

    const beforeCount = jobs.length;
    jobs = jobs.map((j) => {
      const exp = evaluateExperience({ title: j.name }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness(
        { title: j.name, employmentType: j.typeOfEmployment?.label, postedDate: j.releasedDate },
        maxAgeDays,
        excludeInternships
      );
      return {
        id: j.id,
        title: j.name,
        refNumber: j.refNumber,
        location: j.location?.fullLocation,
        remote: j.location?.remote,
        hybrid: j.location?.hybrid,
        department: j.department?.label,
        employmentType: j.typeOfEmployment?.label,
        postedDate: j.releasedDate,
        postingUrl: `https://jobs.smartrecruiters.com/${companyIdentifier}/${j.id}`,
        detected_min_years_experience: exp.detected_min_years_experience,
        looks_senior: exp.looks_senior,
        is_internship: fresh.is_internship,
        age_days: fresh.age_days,
        _exclude: exp.exclude || fresh.exclude,
      };
    });
    const kept = jobs.filter((j) => !j._exclude).map(({ _exclude, ...j }) => j);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              companyIdentifier,
              totalFound: data.totalFound,
              count: kept.length,
              filtered_out_count: beforeCount - kept.length,
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

server.registerTool(
  "get_job_details",
  {
    title: "Get full SmartRecruiters job details",
    description:
      "Fetch the full description (all sections: company description, job description, qualifications, " +
      "additional info) for one specific posting, plus a fresh experience-filter evaluation now that the real " +
      "description text is available. Use the `id` from get_company_jobs.",
    inputSchema: {
      companyIdentifier: z.string(),
      postingId: z.string().describe("The job's `id` field from get_company_jobs"),
      maxYearsExperience: z.number().default(2),
      excludeSeniorTitles: z.boolean().default(true),
    },
  },
  async ({ companyIdentifier, postingId, maxYearsExperience, excludeSeniorTitles }) => {
    const url = `${BASE}/companies/${encodeURIComponent(companyIdentifier)}/postings/${encodeURIComponent(postingId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return { isError: true, content: [{ type: "text", text: `SmartRecruiters request failed: HTTP ${response.status} - ${text}` }] };
    }

    const j = await response.json();
    const sections = j.jobAd?.sections ?? {};
    const description = Object.values(sections)
      .map((s) => stripHtml(s.text))
      .filter(Boolean)
      .join("\n\n");

    const exp = evaluateExperience({ title: j.name, description }, maxYearsExperience, excludeSeniorTitles);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              title: j.name,
              location: j.location?.fullLocation,
              postingUrl: j.postingUrl,
              applyUrl: j.applyUrl,
              description,
              detected_min_years_experience: exp.detected_min_years_experience,
              looks_senior: exp.looks_senior,
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
