/**
 * SLOT GUARD — HARD CLOCK ENFORCEMENT ENGINE
 * Prevents premature leap and enforces strict slot timetable discipline.
 * 
 * If any script tries to execute an action outside its permitted clock window,
 * this guard immediately throws a hard error and terminates process (exit code 1).
 */

const SCHEDULE = {
  // Cycle 1 (Morning: 11:00 AM - 03:00 PM)
  CYCLE1_SLOT1: { start: 11 * 60 + 0,  end: 11 * 60 + 20, name: "Slot 1: Rules & Unified Inbox Review" },
  CYCLE1_SLOT2: { start: 11 * 60 + 20, end: 11 * 60 + 40, name: "Slot 2: Pure 20 MCP ATS Server Scraper & Harvesting" },
  CYCLE1_SLOT3: { start: 11 * 60 + 40, end: 12 * 60 + 0,  name: "Slot 3: Quick Live DOM Audit & Early Job Verification (File 3 -> File 4)" },
  CYCLE1_SLOT4: { start: 12 * 60 + 0,  end: 12 * 60 + 20, name: "Slot 4: Early ATS Portal Applications (File 4 Batch 1 Submission)" },
  CYCLE1_SLOT5: { start: 12 * 60 + 20, end: 12 * 60 + 40, name: "Slot 5: Dedicated Live Feeds (Telegram + LinkedIn + Naukri)" },
  CYCLE1_SLOT6: { start: 12 * 60 + 40, end: 13 * 60 + 20, name: "Slot 6: Quick Live DOM Audit & Merged CDP Verification (File 3 -> File 4 Batch 2)" },
  CYCLE1_SLOT7: { start: 13 * 60 + 20, end: 14 * 60 + 10, name: "Slot 7: Main ATS Portal Forms Submissions (Ashby/GH/Lever - 50 mins)" },
  CYCLE1_SLOT8: { start: 14 * 60 + 10, end: 14 * 60 + 40, name: "Slot 8: Direct Verified Email Dispatches & Referrals" },
  CYCLE1_SLOT9: { start: 14 * 60 + 40, end: 15 * 60 + 0,  name: "Slot 9: Cycle Audit & Scorecard Tracker Lock" },

  // Cycle 2 (Afternoon: 03:00 PM - 07:00 PM)
  CYCLE2_SLOT1: { start: 15 * 60 + 0,  end: 15 * 60 + 20, name: "Cycle 2 Slot 1: Rules & Unified Inbox Review" },
  CYCLE2_SLOT2: { start: 15 * 60 + 20, end: 15 * 60 + 40, name: "Cycle 2 Slot 2: Pure 20 MCP ATS Server Scraper & Harvesting" },
  CYCLE2_SLOT3: { start: 15 * 60 + 40, end: 16 * 60 + 0,  name: "Cycle 2 Slot 3: Quick Live DOM Audit & Early Job Verification (File 3 -> File 4)" },
  CYCLE2_SLOT4: { start: 16 * 60 + 0,  end: 16 * 60 + 20, name: "Cycle 2 Slot 4: Early ATS Portal Applications (File 4 Batch 1 Submission)" },
  CYCLE2_SLOT5: { start: 16 * 60 + 20, end: 16 * 60 + 40, name: "Cycle 2 Slot 5: Dedicated Live Feeds" },
  CYCLE2_SLOT6: { start: 16 * 60 + 40, end: 17 * 60 + 20, name: "Cycle 2 Slot 6: Quick Live DOM Audit & Merged CDP Verification" },
  CYCLE2_SLOT7: { start: 17 * 60 + 20, end: 18 * 60 + 10, name: "Cycle 2 Slot 7: Main ATS Portal Forms Submissions (50 mins)" },
  CYCLE2_SLOT8: { start: 18 * 60 + 10, end: 18 * 60 + 40, name: "Cycle 2 Slot 8: Direct Verified Email Dispatches" },
  CYCLE2_SLOT9: { start: 18 * 60 + 40, end: 19 * 60 + 0,  name: "Cycle 2 Slot 9: Daily Close & Tracker Lock" }
};

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

function getCurrentSlotInfo() {
  const currentMin = getCurrentMinutes();
  for (const [key, slot] of Object.entries(SCHEDULE)) {
    if (currentMin >= slot.start && currentMin < slot.end) {
      return { key, ...slot, currentMin };
    }
  }
  return { key: "OUTSIDE_HOURS", name: "Outside Daily Operating Window", currentMin };
}

function assertSlot(allowedSlotKeys, actionDescription = "This Action") {
  const keys = Array.isArray(allowedSlotKeys) ? allowedSlotKeys : [allowedSlotKeys];
  const currentSlot = getCurrentSlotInfo();
  const currentFormatted = formatMinutes(currentSlot.currentMin);

  // Support explicit user override
  if (process.env.USER_OVERRIDE === '1' || process.argv.includes('--force')) {
    console.log(`⚠️ [SLOT GUARD] User explicit override active. Proceeding with "${actionDescription}" at ${currentFormatted}.`);
    return true;
  }

  const isAllowed = keys.some(k => currentSlot.key === k);

  if (!isAllowed) {
    console.error(`\n🚨 ====================================================================`);
    console.error(`🛑 HARD BLOCK: PREMATURE LEAP / TIMETABLE VIOLATION PREVENTED!`);
    console.error(`--------------------------------------------------------------------`);
    console.error(`- Action Attempted: "${actionDescription}"`);
    console.error(`- Current Time:     ${currentFormatted}`);
    console.error(`- Current Slot:     ${currentSlot.name} (${currentSlot.key})`);
    console.error(`- Allowed In:       ${keys.map(k => SCHEDULE[k] ? `${SCHEDULE[k].name} (${formatMinutes(SCHEDULE[k].start)} - ${formatMinutes(SCHEDULE[k].end)})` : k).join(' OR ')}`);
    console.error(`--------------------------------------------------------------------`);
    console.error(`❌ EXECUTION ABORTED. WAIT FOR SCHEDULED SLOT WINDOW.`);
    console.error(`🚨 ====================================================================\n`);
    process.exit(1);
  }

  console.log(`✅ [SLOT GUARD] Passed check for "${actionDescription}" in ${currentSlot.name} (${currentFormatted})`);
  return true;
}

/**
 * RULE 72: ZERO SLOT SKIPPING / PENDING SLOT RECOVERY
 * If a previous slot is pending or unfinished, permit its recovery execution.
 */
function allowPendingSlotRecovery(pendingSlotKey, actionDescription) {
  const currentSlot = getCurrentSlotInfo();
  console.log(`⚡ [RULE 72 RECOVERY] Executing pending "${actionDescription}" (${pendingSlotKey}) at ${formatMinutes(currentSlot.currentMin)} before advancing.`);
  return true;
}

/**
 * RULE 73: IDLE BUFFER PRODUCTIVE UTILIZATION
 * Returns true if current slot primary tasks are done and buffer time remains before next slot.
 */
function isBufferTimeRemaining(currentSlotEndMin) {
  const currentMin = getCurrentMinutes();
  return currentMin < currentSlotEndMin;
}

module.exports = {
  assertSlot,
  getCurrentSlotInfo,
  formatMinutes,
  SCHEDULE,
  allowPendingSlotRecovery,
  isBufferTimeRemaining
};

