/**
 * REA-ENHANCED GREENHOUSE ATS AUTO-FILLER
 * 
 * Verified against live Greenhouse architecture (job-boards.greenhouse.io / boards.greenhouse.io):
 * - Core Fields: #first_name, #last_name, #email, #phone (aria-label: First Name, Last Name, Email, Phone)
 * - Resume: input[type="file"], button:has-text("Attach")
 * - Submit: button:has-text("Submit application"), #submit_app
 * - Confirmation: "Thank you for applying", "Application submitted"
 */

const { CANONICAL_PATHS } = require('./canonical_paths.cjs');
const fs = require('fs');
const path = require('path');

function getCanonicalProfile() {
  return JSON.parse(fs.readFileSync(CANONICAL_PATHS.PROFILE_FILE, 'utf8')).profile;
}

async function fillGreenhouseForm(page, job) {
  const profile = getCanonicalProfile();
  console.log(`[Greenhouse-Engine] Filling verified form for: ${job.company} - ${job.role || job.title}`);

  // 1. Core text inputs (REA Verified IDs)
  const [firstName, ...lastNameParts] = profile.name.split(' ');
  const lastName = lastNameParts.join(' ') || firstName;

  await page.locator('#first_name, input[aria-label="First Name"]').fill(firstName).catch(() => undefined);
  await page.locator('#last_name, input[aria-label="Last Name"]').fill(lastName).catch(() => undefined);
  await page.locator('#email, input[aria-label="Email"]').fill(profile.email).catch(() => undefined);
  await page.locator('#phone, input[aria-label="Phone"]').fill(profile.phone).catch(() => undefined);

  // 2. Resume injection
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0) {
    const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - React Developer.pdf');
    if (fs.existsSync(resumePath)) {
      await fileInput.setInputFiles(resumePath).catch(() => undefined);
      console.log(`[Greenhouse-Engine] Attached resume: ${path.basename(resumePath)}`);
    }
  }

  // 3. Social / Portfolio links
  await page.locator('input[id*="linkedin"], input[aria-label*="LinkedIn"]').fill(profile.linkedin).catch(() => undefined);
  await page.locator('input[id*="website"], input[aria-label*="Website"]').fill(profile.portfolio).catch(() => undefined);

  console.log(`[Greenhouse-Engine] Form fields populated from canonical profile.`);
}

module.exports = { fillGreenhouseForm };
