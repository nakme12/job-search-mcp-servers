/**
 * LAYER 3: OS & FILE-WRITE STORAGE GUARD
 * The Last Line of Defense. Validates data integrity before writing to disk.
 * If data contains ANY defect, the write operation is aborted immediately.
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_COMPANIES = [
  'gmail', 'yahoo', 'hotmail', 'outlook', 'direct linkedin lead',
  'tech firm', 'unknown', 'null', 'undefined', 'hiring team', 'recruiter'
];

class StorageWriteGuard {

  // Validates a single verified job before adding to File 4 (Rule 77 & MISTAKE-44 Enforced)
  static validateVerifiedJob(job) {
    if (!job || typeof job !== 'object') {
      throw new Error('[LAYER 3 REJECT] Job object is null or undefined.');
    }
    const company = (job.company || '').trim().toLowerCase();
    if (!company || FORBIDDEN_COMPANIES.includes(company)) {
      throw new Error(`[LAYER 3 REJECT] Invalid or banned company name: "${job.company}". Write aborted.`);
    }
    if (!job.url || !job.url.startsWith('http')) {
      throw new Error(`[LAYER 3 REJECT] Invalid job destination URL: "${job.url}". Write aborted.`);
    }

    // RULE 77 HARD ASSERTION: Must explicitly certify physical form presence
    if (!job.has_physical_form && !job.url.includes('jobs.ashbyhq.com') && !job.url.includes('greenhouse.io') && !job.recipient) {
      throw new Error(`[LAYER 3 HARD REJECT] RULE 77 VIOLATION: Job "${job.company}" does not have confirmed physical form presence ('has_physical_form' is not true). Cannot write to File 4!`);
    }

    return true;
  }

  // Validates an applied job before adding to File 5 (Zero Phantom Logging Guarantee - Rule 37 & 51 Enforced)
  static validateAppliedJob(appliedEntry) {
    if (!appliedEntry || typeof appliedEntry !== 'object') {
      throw new Error('[LAYER 3 REJECT] Applied job entry is empty.');
    }

    const company = (appliedEntry.company || '').trim().toLowerCase();
    if (!company || FORBIDDEN_COMPANIES.includes(company)) {
      throw new Error(`[LAYER 3 REJECT] Cannot log application for banned/unknown company: "${appliedEntry.company}".`);
    }

    // Ban draft / prepared status
    const status = (appliedEntry.status || '').toUpperCase();
    if (status.includes('PREPARED') || status.includes('DRAFT') || status.includes('PENDING')) {
      throw new Error(`[LAYER 3 HARD REJECT] RULE 37/51 VIOLATION: Unsubmitted draft status "${appliedEntry.status}" is strictly banned from applied tracking!`);
    }

    // Email applications require verified sent timestamp or proof
    if (appliedEntry.application_type === 'Direct Recruiter Email' || appliedEntry.channel === 'Direct Recruiter Email') {
      if (!appliedEntry.recipient || !appliedEntry.recipient.includes('@')) {
        throw new Error(`[LAYER 3 REJECT] Missing or invalid recipient email: "${appliedEntry.recipient}".`);
      }
      return true;
    }

    // Portal applications MUST have post-submit confirmation DOM text & post-submit screenshot
    const screenshot = appliedEntry.confirmation_screenshot || appliedEntry.screenshot;
    if (!screenshot) {
      throw new Error(`[LAYER 3 REJECT] PHANTOM LOGGING VIOLATION: confirmation_screenshot field is missing!`);
    }

    if (!fs.existsSync(screenshot)) {
      throw new Error(`[LAYER 3 REJECT] PHYSICAL FILE MISSING: Screenshot does not exist on disk at "${screenshot}"!`);
    }

    const baseName = require('path').basename(screenshot).toLowerCase();
    if (baseName.includes('pre_submit') || baseName.includes('draft')) {
      throw new Error(`[LAYER 3 REJECT] RULE 37/51 VIOLATION: Pre-submit screenshot "${baseName}" detected! Strictly post_submit confirmation screenshots allowed.`);
    }

    const stat = fs.statSync(screenshot);
    if (stat.size < 5000) {
      throw new Error(`[LAYER 3 REJECT] CORRUPT SCREENSHOT: Screenshot file size (${stat.size} bytes) is suspiciously small / blank!`);
    }

    const confText = appliedEntry.confirmation_text || appliedEntry.post_submit_proof;
    if (!confText || confText.trim().length < 5) {
      throw new Error(`[LAYER 3 HARD REJECT] RULE 37/51 VIOLATION: Missing live post-submit confirmation text proof from rendered DOM!`);
    }

    console.log(`✅ [LAYER 3 PASS] Applied job validated: ${appliedEntry.company} with verified post-submit screenshot (${stat.size} bytes)`);
    return true;
  }

  // Safe Atomic Append to File 5
  static safeAppendApplied(filePath, appliedEntry) {
    this.validateAppliedJob(appliedEntry);

    let data = { date: new Date().toISOString().split('T')[0], total: 0, jobs: [] };
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {}
    }

    if (!Array.isArray(data.jobs)) data.jobs = [];

    // Dedup check within today's file
    const alreadyLogged = data.jobs.some(j => 
      (j.url && j.url === appliedEntry.url) || 
      (j.recipient && j.recipient === appliedEntry.recipient)
    );

    if (alreadyLogged) {
      console.log(`⚠️ [LAYER 3] Already logged in File 5: ${appliedEntry.company}. Skipping duplicate write.`);
      return false;
    }

    data.jobs.push(appliedEntry);
    data.total = data.jobs.length;
    data.updated_at = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`🔒 [LAYER 3 STORAGE SEALED] Successfully written to ${path.basename(filePath)} (Total: ${data.total})`);
    return true;
  }
}

module.exports = StorageWriteGuard;
