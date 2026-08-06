import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const server = new McpServer({
  name: "lever-jobs",
  version: "1.0.0",
});

server.registerTool(
  "get_company_jobs",
  {
    title: "Get a company's Lever job board",
    description:
      "Fetch open job postings for a specific company that uses Lever as its ATS, via Lever's public, " +
      "unauthenticated postings API. No key needed. Single company at a time (no cross-company search) - you " +
      "need the company's Lever slug, the last part of their careers URL, e.g. https://jobs.lever.co/palantir " +
      "-> slug is 'palantir'. Lever supports real server-side filters (team, location, commitment) unlike Ashby/" +
      "Greenhouse - narrow with those first, cheaper than client-side filtering.",
    inputSchema: {
      company: z.string().describe("The company's Lever slug, e.g. 'palantir' from jobs.lever.co/palantir"),
      team: z.string().optional().describe("Server-side filter: exact team name as it appears on their board"),
      location: z.string().optional().describe("Server-side filter: exact location string as it appears on their board"),
      commitment: z.string().optional().describe("Server-side filter: e.g. 'Full-time', 'Internship'"),
      titleContains: z.string().optional().describe("Client-side: case-insensitive substring against job title"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe(
          "Client-side safety net (same rule as every job-search server in this repo): Lever has no structured " +
            "experience field, so this regex-scans title/description. Set high (e.g. 99) to disable."
        ),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Drop jobs whose title/description reads as Senior/Lead/Staff/Principal/Architect/Manager/Director."),
      maxAgeDays: z
        .number()
        .default(90)
        .describe("Client-side safety net against `createdAt`. Set high (e.g. 9999) to disable."),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe(
          "Drop jobs whose title/commitment reads as an internship/traineeship. `commitment: 'Internship'` above " +
            "is Lever's own server-side filter - simply not passing that value is cheaper."
        ),
    },
  },
  async ({ company, team, location, commitment, titleContains, maxYearsExperience, excludeSeniorTitles, maxAgeDays, excludeInternships }) => {
    const url = new URL(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}`);
    url.searchParams.set("mode", "json");
    if (team) url.searchParams.set("team", team);
    if (location) url.searchParams.set("location", location);
    if (commitment) url.searchParams.set("commitment", commitment);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return { isError: true, content: [{ type: "text", text: `Lever request failed: HTTP ${response.status} - ${text}` }] };
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unexpected Lever response - check that '${company}' is the correct slug. Got: ${JSON.stringify(data).slice(0, 300)}` }],
      };
    }

    let jobs = data;
    if (titleContains) {
      const needle = titleContains.toLowerCase();
      jobs = jobs.filter((j) => (j.text ?? "").toLowerCase().includes(needle));
    }

    const beforeCount = jobs.length;
    jobs = jobs.map((j) => {
      const description = j.descriptionPlain || j.description || "";
      const exp = evaluateExperience({ title: j.text, description }, maxYearsExperience, excludeSeniorTitles);
      const fresh = evaluateFreshness(
        { title: j.text, employmentType: j.categories?.commitment, postedDate: j.createdAt },
        maxAgeDays,
        excludeInternships
      );
      return {
        title: j.text,
        team: j.categories?.team,
        department: j.categories?.department,
        location: j.categories?.location,
        commitment: j.categories?.commitment,
        hostedUrl: j.hostedUrl,
        applyUrl: j.applyUrl,
        createdAt: j.createdAt,
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
