// remoterocketship-core.js
// Remote Rocketship has no official public API - this wraps a third-party Apify
// scraper actor instead. Unlike career-site-core.js's Apify actor (pay-per-result,
// ~$4/1000), this one is billed as a recurring MONTHLY SUBSCRIPTION (~$19.89/mo +
// platform usage) regardless of how much you call it - the user explicitly confirmed
// they want this cost before this file was written.
//
// IMPORTANT: the field names below (jobTitleField/companyField/etc.) are best-effort
// guesses from the actor's public listing page copy, not a verified live response -
// nobody has an active subscription to this actor yet to test against. The first time
// this actually runs, log a raw sample item and correct any field-name mismatch below.
import "dotenv/config";
import { evaluateExperience } from "./experience-filter.js";
import { evaluateFreshness } from "./freshness-filter.js";

const ACTOR_ID = "scrapestorm~remote-rocketship-jobs-scraper---cheap";
const API_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`;

function buildSearchUrl({ jobTitle, page = 1, sort = "DateAdded" }) {
  const url = new URL("https://www.remoterocketship.com/");
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", sort);
  if (jobTitle) url.searchParams.set("jobTitle", jobTitle);
  return url.toString();
}

// Reads the first present key from a list of guessed field-name variants.
function pick(obj, keys) {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

export async function searchRemoteRocketshipJobs({
  jobTitle,
  page = 1,
  sort = "DateAdded",
  maxitems = 30,
  maxYearsExperience = 2,
  excludeSeniorTitles = true,
  maxAgeDays = 90,
  excludeInternships = true,
} = {}) {
  const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_API_TOKEN) throw new Error("Missing APIFY_API_TOKEN env var.");

  const body = {
    urls: [{ url: buildSearchUrl({ jobTitle, page, sort }) }],
    maxitems,
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${APIFY_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Apify (Remote Rocketship) request failed: HTTP ${response.status} - ${text}`);
  }

  let items;
  try {
    items = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse Remote Rocketship response: ${text.slice(0, 500)}`);
  }

  const allItems = Array.isArray(items) ? items : [];
  const kept = allItems.filter((raw) => {
    const title = pick(raw, ["title", "jobTitle", "job_title", "position"]);
    const description = pick(raw, ["description", "jobDescription", "job_description"]);
    const company = pick(raw, ["company", "employer", "companyName", "employerName"]);
    const location = pick(raw, ["location", "jobLocation", "job_location"]);
    const url = pick(raw, ["url", "link", "jobUrl", "job_url", "applyUrl"]);
    const postedDate = pick(raw, ["postedDate", "postedAt", "datePosted", "postingTimestamp"]);

    const exp = evaluateExperience({ title, description }, maxYearsExperience, excludeSeniorTitles);
    const fresh = evaluateFreshness({ title, postedDate }, maxAgeDays, excludeInternships);

    raw.title = title;
    raw.company = company;
    raw.location = location;
    raw.url = url;
    raw.detected_min_years_experience = exp.detected_min_years_experience;
    raw.looks_senior = exp.looks_senior;
    raw.is_internship = fresh.is_internship;
    raw.age_days = fresh.age_days;
    return !exp.exclude && !fresh.exclude;
  });

  return { count: kept.length, filtered_out_count: allItems.length - kept.length, jobs: kept };
}
