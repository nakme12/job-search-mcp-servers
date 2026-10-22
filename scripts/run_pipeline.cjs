/**
 * MASTER RUNNER & INTERLINKED PIPELINE ORCHESTRATOR
 * 
 * Enforces:
 * 1. 9-Slot Timetable Discipline (scripts/slot_guard.cjs)
 * 2. Dedicated Single-Responsibility Slot Modules (scripts/slots/)
 * 3. 3-Layer Defense Interceptors (Salutation, YOE Ceiling, Screenshot Physical Proof)
 */

const fs = require('fs');
const path = require('path');
const { getCurrentSlotInfo, formatMinutes } = require('./slot_guard.cjs');

const { runSlot1 } = require('./slots/slot1_inbox_review.cjs');
const { runSlot2 } = require('./slots/slot2_mcp_harvest.cjs');
const { runSlot3 } = require('./slots/slot3_early_audit.cjs');
const { runSlot4 } = require('./slots/slot4_early_portals.cjs');
const { runSlot5 } = require('./slots/slot5_live_feeds.cjs');
const { runSlot6 } = require('./slots/slot6_merged_audit.cjs');
const { runSlot7 } = require('./slots/slot7_main_portals.cjs');
const { runSlot8 } = require('./slots/slot8_email_dispatches.cjs');
const { runSlot9 } = require('./slots/slot9_cycle_audit.cjs');

function log(msg) {
  console.log(`[MASTER-ORCHESTRATOR] ${new Date().toISOString()} ${msg}`);
}

async function runCurrentSlotTask() {
  const currentSlot = getCurrentSlotInfo();
  log(`\n====================================================================`);
  log(`🚀 PIPELINE ORCHESTRATOR ENGAGED: Current Time is ${formatMinutes(currentSlot.currentMin)}`);
  log(`🎯 ACTIVE SCHEDULED SLOT: ${currentSlot.name} (${currentSlot.key})`);
  log(`====================================================================\n`);

  if (currentSlot.key === 'OUTSIDE_HOURS' && !process.argv.includes('--force')) {
    log('⚠️ Current time is outside operating window (11:00 AM - 07:00 PM).');
    log('Run with --force to execute out of hours.');
    return;
  }

  const force = process.argv.includes('--force');

  switch (currentSlot.key) {
    case 'CYCLE1_SLOT1':
    case 'CYCLE2_SLOT1':
      await runSlot1(force);
      break;

    case 'CYCLE1_SLOT2':
    case 'CYCLE2_SLOT2':
      await runSlot2(force);
      break;

    case 'CYCLE1_SLOT3':
    case 'CYCLE2_SLOT3':
      await runSlot3(force);
      break;

    case 'CYCLE1_SLOT4':
    case 'CYCLE2_SLOT4':
      await runSlot4(force);
      break;

    case 'CYCLE1_SLOT5':
    case 'CYCLE2_SLOT5':
      await runSlot5(force);
      break;

    case 'CYCLE1_SLOT6':
    case 'CYCLE2_SLOT6':
      await runSlot6(force);
      break;

    case 'CYCLE1_SLOT7':
    case 'CYCLE2_SLOT7':
      await runSlot7(force);
      break;

    case 'CYCLE1_SLOT8':
    case 'CYCLE2_SLOT8':
      await runSlot8(force);
      break;

    case 'CYCLE1_SLOT9':
    case 'CYCLE2_SLOT9':
      await runSlot9(force);
      break;

    default:
      log(`Unhandled or outside window slot: ${currentSlot.key}`);
  }
}

if (require.main === module) {
  runCurrentSlotTask().catch(err => {
    console.error('Fatal Orchestrator Error:', err);
    process.exit(1);
  });
}

module.exports = { runCurrentSlotTask };
