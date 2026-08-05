import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ACTOR_ID = "fantastic-jobs~career-site-job-listing-api";
const API_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`;

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_API_TOKEN) {
  console.error(
    "Missing APIFY_API_TOKEN env var. Set it in your MCP client config's env block."
  );
  process.exit(1);
}

const stringArray = () => z.array(z.string()).optional();

const server = new McpServer({
  name: "career-site-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search career-site job listings (Apify)",
    description:
      "Search job postings aggregated from 175k+ company career sites across 54 ATS " +
      "platforms (Workday, Greenhouse, Ashby, Lever, etc.), via the fantastic-jobs " +
      "Career Site Job Listing API on Apify. Results are AI-enriched with salary, " +
      "skills, experience level, and remote-work classification. " +
      "NOTE: this actor is billed at ~$4 per 1,000 jobs returned — keep `limit` as low " +
      "as reasonable for the task.",
    inputSchema: {
      timeRange: z
        .enum(["1h", "24h", "7d", "6m"])
        .optional()
        .describe("How far back to look for postings; 6m is a full backfill"),
      limit: z
        .number()
        .int()
        .min(10)
        .max(5000)
        .default(20)
        .describe("Max jobs to return (10-5000; API enforces a minimum of 10; costs ~$4 per 1000)"),
      titleSearch: stringArray().describe("Job title keywords, e.g. ['Software Engineer']. Supports 'prefix:*' matching"),
      titleExclusionSearch: stringArray().describe("Exclude jobs with these title keywords"),
      locationSearch: stringArray().describe("Locations as 'City, State, Country', e.g. ['San Francisco, California, United States']"),
      locationExclusionSearch: stringArray(),
      descriptionSearch: stringArray().describe("Keywords to search within job descriptions (slower; combine with other filters)"),
      descriptionExclusionSearch: stringArray(),
      organizationSearch: stringArray().describe("Company names, supports 'prefix:*' matching"),
      organizationExclusionSearch: stringArray(),
      domainFilter: stringArray().describe("Exact company domains"),
      domainExclusionFilter: stringArray(),
      descriptionType: z.enum(["text", "html"]).optional(),
      ats: stringArray().describe("ATS platform IDs to include (e.g. greenhouse, lever, workday)"),
      atsExclusionFilter: stringArray(),
      aiEmploymentTypeFilter: stringArray().describe("e.g. FULL_TIME, PART_TIME, CONTRACTOR"),
      aiWorkArrangementFilter: stringArray().describe("On-site, Hybrid, Remote OK, Remote Solely"),
      hasSalary: z.boolean().optional().describe("Only jobs with salary data"),
      aiExperienceLevelFilter: stringArray().describe("0-2, 2-5, 5-10, 10+ years"),
      aiVisaSponsorshipFilter: z.boolean().optional(),
      aiTaxonomiesFilter: stringArray().describe("Categories like Technology, Healthcare, etc."),
      aiTaxonomiesPrimaryFilter: stringArray(),
      aiTaxonomiesExclusionFilter: stringArray(),
      aiLanguageFilter: stringArray().describe("Job description language, e.g. ['English']"),
      removeAgency: z.boolean().optional().describe("Filter out recruitment agency postings"),
      liIndustryFilter: stringArray().describe("LinkedIn industry categories"),
      liIndustryExclusionFilter: stringArray(),
      liOrganizationEmployeesGte: z.number().int().optional().describe("Minimum company employee count"),
      liOrganizationEmployeesLte: z.number().int().optional().describe("Maximum company employee count"),
      liOrganizationSizeFilter: stringArray().describe("Size buckets, e.g. '1', '2-10', '11-50'"),
      datePostedAfter: z.string().optional().describe("'2025-01-01' or '2025-01-01T14:00:00' (UTC)"),
      includeCompanyDetails: z.boolean().optional().describe("Add LinkedIn/Crunchbase/logo data (larger response)"),
      populateAiRemoteLocation: z.boolean().optional(),
      populateAiRemoteLocationDerived: z.boolean().optional(),
      hasNoLocation: z.boolean().optional().describe("Only jobs with no normalized location"),
    },
  },
  async (args) => {
    const body = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) body[key] = value;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: `Apify request failed: HTTP ${response.status} - ${text}` }],
      };
    }

    let items;
    try {
      items = JSON.parse(text);
    } catch {
      return { isError: true, content: [{ type: "text", text: `Failed to parse response: ${text.slice(0, 500)}` }] };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: Array.isArray(items) ? items.length : undefined, items }, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
