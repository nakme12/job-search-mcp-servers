import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "workable-jobs",
  version: "1.0.0",
});

server.registerTool(
  "get_company_jobs",
  {
    title: "Get a company's Workable job board",
    description:
      "Fetch open job postings for a specific company that uses Workable as its ATS, via Workable's public, " +
      "unauthenticated widget API. No key needed. Single company at a time (no cross-company search) - you " +
      "need the company's Workable slug, the last part of their careers URL, e.g. https://apply.workable.com/huggingface " +
      "-> slug is 'huggingface'.",
    inputSchema: {
      company: z.string().describe("The company's Workable slug, e.g. 'huggingface' from apply.workable.com/huggingface"),
      titleContains: z.string().optional().describe("Client-side: case-insensitive substring against job title"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): Workable has no structured " +
            "experience field, so this regex-scans title/description. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side safety net against `published_on`. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/employment_type reads as an internship/traineeship."),
    },
  },
  async ({ company, titleContains, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    const url = new URL(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(company)}`);
    url.searchParams.set("details", "true");

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return { isError: true, content: [{ type: "text", text: `Workable request failed: HTTP ${response.status} - ${text}` }] };
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.jobs)) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unexpected Workable response - check that '${company}' is the correct slug. Got: ${JSON.stringify(data).slice(0, 300)}` }],
      };
    }

    let jobs = data.jobs;
    if (titleContains) {
      const needle = titleContains.toLowerCase();
      jobs = jobs.filter((j) => (j.title ?? "").toLowerCase().includes(needle));
    }

    const beforeCount = jobs.length;
    jobs = jobs.map((j) => {
      const description = j.description || "";
      const exp = evaluateExperience({ title: j.title, description }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness(
        { title: j.title, employmentType: j.employment_type, postedDate: j.published_on || j.created_at },
        maxAgeDays,
        excludeInternships
      );
      
      const locationParts = [j.city, j.state, j.country].filter(Boolean);
      const location = locationParts.join(", ") || "Remote";

      return {
        title: j.title,
        department: j.department,
        location,
        remote: j.telecommuting === true || location.toLowerCase().includes("remote"),
        employment_type: j.employment_type,
        hostedUrl: j.url || j.shortlink,
        applyUrl: j.application_url || j.url,
        published_on: j.published_on || j.created_at,
        description,
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
        { type: "text", text: JSON.stringify({ company, count: kept.length, filtered_out_count: beforeCount - kept.length, jobs: kept }, null, 2) },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
