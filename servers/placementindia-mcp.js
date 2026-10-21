import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const BASE_SEARCH_URL = "https://www.placementindia.com/job-search/search.php";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const TARGET_LOCATIONS = [
  "Delhi",
  "Noida",
  "Gurgaon",
  "Gurugram",
  "Delhi NCR",
  "Pune",
  "Ahmedabad",
  "Bangalore",
  "Bengaluru",
  "Indore",
  "Surat",
  "Work From Home",
  "Remote",
  "WFH"
];

function cleanHtmlText(str) {
  return (str || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRecruiterEmail(raw) {
  const m = raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?:co\.in|com|org|net|edu|gov|co|in))/i);
  return m ? m[1] : raw;
}

/**
 * Parses raw HTML search results from PlacementIndia into structured job objects.
 */
export function parsePlacementIndiaSearchHtml(html) {
  const parts = html.split('<div class="sjc-iteam');
  const rawCards = parts.slice(1);
  const jobs = [];

  for (const card of rawCards) {
    const urlMatch =
      card.match(/data-url=["'](https:\/\/www\.placementindia\.com\/job-detail\/[^"']+)["']/) ||
      card.match(/href=["'](https:\/\/www\.placementindia\.com\/job-detail\/[^"']+)["']/);
    const jobUrl = urlMatch ? urlMatch[1] : null;

    // Ignore non-job promotional banners
    if (!jobUrl || !jobUrl.includes("/job-detail/")) {
      continue;
    }

    const titleMatch =
      card.match(/<a[^>]*class=["']job-name["'][^>]*><h3>([\s\S]*?)<\/h3><\/a>/i) ||
      card.match(/<h3>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? cleanHtmlText(titleMatch[1]) : "";

    const compMatch = card.match(/<p[^>]*class=["']job-cname["'][^>]*>([\s\S]*?)<\/p>/i);
    const company = compMatch ? cleanHtmlText(compMatch[1]) : "";

    const needMatch = card.match(/<ul[^>]*class=["']sjci-need["'][^>]*>([\s\S]*?)<\/ul>/i);
    let experienceText = "";
    let salaryText = "";
    let locationText = "";

    if (needMatch) {
      const lis = needMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const li of lis) {
        const text = cleanHtmlText(li);
        if (li.includes("icon_exp")) {
          experienceText = text;
        } else if (li.includes("rupee") || /lac|inr|₹/i.test(text)) {
          salaryText = text;
        } else if (li.includes("icon_location")) {
          locationText = text;
        } else if (!experienceText && /yrs?|years?|fresher/i.test(text)) {
          experienceText = text;
        } else if (!locationText && !/lac|inr|₹|yrs|year/i.test(text)) {
          locationText = text;
        }
      }
    }

    const skillsMatch = card.match(/<div[^>]*class=["']sk_list["'][^>]*>([\s\S]*?)<\/div>/i);
    const skills = skillsMatch ? cleanHtmlText(skillsMatch[1]) : "";

    const descMatch = card.match(/<div[^>]*class=["']jobInner["'][^>]*>([\s\S]*?)<\/div>/i);
    const description = descMatch ? cleanHtmlText(descMatch[1]) : "";

    // Parse email if found in text
    const emailMatches = card.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    let recruiter_contact = null;
    if (emailMatches) {
      const cleanedEmails = emailMatches
        .map(cleanRecruiterEmail)
        .filter(e => !e.includes("placementindia") && !e.includes("sentry"));
      if (cleanedEmails.length > 0) {
        recruiter_contact = Array.from(new Set(cleanedEmails)).join(", ");
      }
    }

    jobs.push({
      title,
      company,
      location: locationText,
      experience: experienceText,
      salary: salaryText,
      skills,
      description,
      jobUrl,
      recruiter_contact,
      postedDate: null
    });
  }

  return jobs;
}

/**
 * Fetch detail page to extract posted date, structured JSON-LD data and contact info
 */
export async function enrichJobDetails(job) {
  if (!job.jobUrl) return job;
  try {
    const res = await fetch(job.jobUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    if (!res.ok) return job;
    const html = await res.text();

    const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (ldMatches) {
      for (const m of ldMatches) {
        const jsonText = m.replace(/<script type="application\/ld\+json">|<\/script>/gi, "").trim();
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed["@type"] === "JobPosting") {
            if (parsed.datePosted) {
              job.postedDate = parsed.datePosted;
            }
            if (parsed.jobLocation && parsed.jobLocation.address) {
              const addr = parsed.jobLocation.address;
              const locParts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
              if (locParts.length > 0 && (!job.location || job.location.length < 3)) {
                job.location = locParts.join(", ");
              }
            }
            break;
          }
        } catch (e) {}
      }
    }

    if (!job.postedDate) {
      const pm = html.match(/Posted\s+([^<\r\n]+)/i);
      if (pm) {
        job.postedDate = pm[0].trim();
      }
    }

    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches) {
      const unique = Array.from(new Set(emailMatches.map(cleanRecruiterEmail)))
        .filter(e => !e.includes("placementindia") && !e.includes("sentry"));
      if (unique.length > 0) {
        job.recruiter_contact = unique.join(", ");
      }
    }
  } catch (err) {
    // Graceful fallback to card details
  }
  return job;
}

export function matchesTargetLocations(locationStr) {
  if (!locationStr) return false;
  const loc = locationStr.toLowerCase();
  return (
    loc.includes("delhi") ||
    loc.includes("noida") ||
    loc.includes("gurgaon") ||
    loc.includes("gurugram") ||
    loc.includes("ncr") ||
    loc.includes("pune") ||
    loc.includes("ahmedabad") ||
    loc.includes("bangalore") ||
    loc.includes("bengaluru") ||
    loc.includes("indore") ||
    loc.includes("surat") ||
    loc.includes("remote") ||
    loc.includes("work from home") ||
    loc.includes("wfh")
  );
}

export async function searchPlacementIndia({
  keywords = ["React Developer", "Frontend Developer", "MERN Stack Developer", "Full Stack Developer"],
  cities = ["Delhi", "Noida", "Pune", "Ahmedabad", "Bangalore", "Indore", "Surat"],
  maxYearsExperience = 2,
  maxAgeDays = 7,
  excludeSeniorTitles = true,
  excludeInternships = true,
  targetLocationsOnly = true,
  enrichWithDetailPage = true
} = {}) {
  const allRawJobs = [];
  const seenUrls = new Set();

  for (const keyword of keywords) {
    // 1. Search overall keyword (recent sorted)
    const overallUrl = `${BASE_SEARCH_URL}?seeker_search_keyword=${encodeURIComponent(keyword)}&filter=date`;
    try {
      const res = await fetch(overallUrl, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        const html = await res.text();
        const parsed = parsePlacementIndiaSearchHtml(html);
        for (const j of parsed) {
          if (!seenUrls.has(j.jobUrl)) {
            seenUrls.add(j.jobUrl);
            allRawJobs.push(j);
          }
        }
      }
    } catch (e) {}

    // 2. Search targeted cities
    for (const city of cities) {
      const cityUrl = `${BASE_SEARCH_URL}?seeker_search_keyword=${encodeURIComponent(keyword)}&seeker_search_city=${encodeURIComponent(city)}&filter=date`;
      try {
        const res = await fetch(cityUrl, { headers: { "User-Agent": USER_AGENT } });
        if (res.ok) {
          const html = await res.text();
          const parsed = parsePlacementIndiaSearchHtml(html);
          for (const j of parsed) {
            if (!seenUrls.has(j.jobUrl)) {
              seenUrls.add(j.jobUrl);
              allRawJobs.push(j);
            }
          }
        }
      } catch (e) {}
    }
  }

  // Pre-filter by location & experience heuristics before fetching details
  const preFiltered = allRawJobs.filter((job) => {
    if (targetLocationsOnly && !matchesTargetLocations(job.location)) {
      return false;
    }
    // Also check experience text directly (e.g. "3 - 5 yrs" or "0 - 1 yrs")
    const combinedExpCheck = `${job.title || ""} ${job.experience || ""} ${job.description || ""}`;
    const expEval = evaluateExperience({ title: job.title, description: combinedExpCheck }, maxYearsExperience, excludeSeniorTitles);
    if (expEval.exclude) {
      return false;
    }
    return true;
  });

  // Enrich with detail page if requested (dates, full descriptions, contacts)
  const enrichedJobs = [];
  for (const job of preFiltered) {
    if (enrichWithDetailPage) {
      await enrichJobDetails(job);
    }
    enrichedJobs.push(job);
  }

  // Final evaluation for experience & freshness
  const finalFiltered = enrichedJobs.filter((job) => {
    const combinedExpCheck = `${job.title || ""} ${job.experience || ""} ${job.description || ""}`;
    const expEval = evaluateExperience({ title: job.title, description: combinedExpCheck }, maxYearsExperience, excludeSeniorTitles);
    if (expEval.exclude) return false;

    const freshEval = evaluateFreshness(job, maxAgeDays, excludeInternships);
    if (freshEval.exclude) return false;

    job.experience_evaluation = expEval;
    job.freshness_evaluation = freshEval;
    return true;
  });

  return {
    totalRawFound: allRawJobs.length,
    preFilteredCount: preFiltered.length,
    finalFilteredCount: finalFiltered.length,
    jobs: finalFiltered
  };
}

const server = new McpServer({
  name: "placementindia-jobs",
  version: "1.0.0"
});

server.registerTool(
  "search_jobs",
  {
    title: "Search PlacementIndia jobs",
    description:
      "Search fresh job listings from PlacementIndia (https://www.placementindia.com/) for tech roles in India. " +
      "Filters by target roles (React, Frontend, MERN, Full Stack), 0-2 YOE experience, target locations (Delhi NCR, Noida, Pune, Ahmedabad, Bangalore, Indore, Surat, WFH), and freshness (maxAgeDays).",
    inputSchema: {
      keywords: z
        .array(z.string())
        .default(["React Developer", "Frontend Developer", "MERN Stack Developer", "Full Stack Developer"])
        .describe("Target job role queries"),
      cities: z
        .array(z.string())
        .default(["Delhi", "Noida", "Pune", "Ahmedabad", "Bangalore", "Indore", "Surat"])
        .describe("Target Indian cities"),
      maxYearsExperience: z
        .number()
        .default(2)
        .describe("Max years of experience (0-2 YOE)"),
      maxAgeDays: z
        .number()
        .default(7)
        .describe("Maximum posting age in days (strictly fresh, e.g. 7 days)"),
      excludeSeniorTitles: z
        .boolean()
        .default(true)
        .describe("Exclude senior / lead titles"),
      excludeInternships: z
        .boolean()
        .default(true)
        .describe("Exclude internships / traineeships"),
      targetLocationsOnly: z
        .boolean()
        .default(true)
        .describe("Filter strictly for target locations (Delhi NCR, Noida, Pune, Ahmedabad, Bangalore, Indore, Surat, WFH/Remote)")
    }
  },
  async (args) => {
    try {
      const result = await searchPlacementIndia(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error searching PlacementIndia: ${err.message}`
          }
        ]
      };
    }
  }
);

// Start server when run directly
if (process.argv[1] && (process.argv[1].endsWith("placementindia-mcp.js") || process.argv[1].endsWith("placementindia-mcp.mjs"))) {
  const transport = new StdioServerTransport();
  server.connect(transport).catch(console.error);
}
