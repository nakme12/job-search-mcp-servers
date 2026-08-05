import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = "https://huntyourtribe.com/api/external-jobs";

// Filter fields accepted by the API (confirmed via probing; unrecognized keys
// make the whole request fail with "Invalid external jobs listing filter field").
const stringOrArray = () => z.union([z.string(), z.array(z.string())]).optional();

const server = new McpServer({
  name: "huntyourtribe-jobs",
  version: "1.0.0",
});

server.registerTool(
  "search_jobs",
  {
    title: "Search HuntYourTribe jobs",
    description:
      "Search job listings from huntyourtribe.com, grouped by company. " +
      "Supports pagination and filtering by department, level, role type, work mode, " +
      "location, role name, skills, and company name. Filter values are exact matches " +
      "(not substring search), except role_name/skills/company appear to do partial matching " +
      "server-side in some cases. Any filter field can be a single string or an array of strings.",
    inputSchema: {
      page: z.number().int().min(1).default(1).describe("Page number, 1-indexed"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(60)
        .default(20)
        .describe("Number of companies (groups) per page, max 60"),
      jobs_limit: z
        .number()
        .int()
        .min(1)
        .default(10)
        .describe("Number of jobs to return per company"),
      department: stringOrArray().describe(
        "e.g. Engineering, Software Development, Sales, Marketing, Design, Data and Analytics, Finance and Accounting, Human Resources, Customer Service, Business Operations, Legal and Compliance, Product Management, Project and Program Management, Quality Assurance, Information Technology, Healthcare, Other"
      ),
      level: stringOrArray().describe(
        "e.g. Entry Level, Intern, Lead, Director, Principal, Senior, Executive"
      ),
      role_type: stringOrArray().describe("e.g. Full-time, Part-time, Contract, Internship"),
      work_mode: stringOrArray().describe("e.g. Remote, Hybrid, On-site"),
      continent: stringOrArray().describe("e.g. Asia, Europe, North America"),
      country: stringOrArray().describe("e.g. USA, United Kingdom, India, Germany"),
      city: stringOrArray(),
      role_name: stringOrArray().describe("Exact job title, e.g. 'Business Analyst'"),
      skills: stringOrArray().describe("e.g. Python, React"),
      company: stringOrArray().describe("Company name, e.g. 'Tide'"),
    },
  },
  async ({ page, limit, jobs_limit, ...filterFields }) => {
    const filter = {};
    for (const [key, value] of Object.entries(filterFields)) {
      if (value !== undefined) filter[key] = value;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://huntyourtribe.com",
        referer: "https://huntyourtribe.com/jobs",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ page, limit, jobs_limit, filter }),
    });

    if (!response.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: `Request failed: HTTP ${response.status}` }],
      };
    }

    const json = await response.json();

    if (!json.success) {
      return {
        isError: true,
        content: [{ type: "text", text: json.message ?? "Unknown API error" }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ meta: json.meta, data: json.data }, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
