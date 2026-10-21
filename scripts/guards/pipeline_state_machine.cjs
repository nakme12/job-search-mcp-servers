/**
 * LAYER 2: MASTER PIPELINE STATE MACHINE ORCHESTRATOR
 * Eliminates LLM Free Will & Hallucinated Workflow Steps.
 * States must transition strictly through validated gates.
 */

const fs = require('fs');
const path = require('path');
const { getCurrentSlotInfo, formatMinutes, SCHEDULE } = require('../slot_guard.cjs');

const STATES = {
  UNINITIALIZED: 'UNINITIALIZED',
  SLOT1_INBOX_AUDIT: 'SLOT1_INBOX_AUDIT',
  SLOT2_FLEET_HARVEST: 'SLOT2_FLEET_HARVEST',
  SLOT3_LIVE_FEEDS: 'SLOT3_LIVE_FEEDS',
  SLOT4_CDP_DOM_AUDIT: 'SLOT4_CDP_DOM_AUDIT',
  SLOT5_EMAIL_DISPATCH: 'SLOT5_EMAIL_DISPATCH',
  SLOT6_ATS_PORTALS: 'SLOT6_ATS_PORTALS',
  SLOT7_DAILY_SYNC: 'SLOT7_DAILY_SYNC'
};

const STATE_FLOW = [
  STATES.SLOT1_INBOX_AUDIT,
  STATES.SLOT2_FLEET_HARVEST,
  STATES.SLOT3_LIVE_FEEDS,
  STATES.SLOT4_CDP_DOM_AUDIT,
  STATES.SLOT5_EMAIL_DISPATCH,
  STATES.SLOT6_ATS_PORTALS,
  STATES.SLOT7_DAILY_SYNC
];

class PipelineStateMachine {
  constructor(dateStr = null) {
    const now = new Date();
    this.date = dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.stateFilePath = path.join(__dirname, '..', `pipeline_state_${this.date}.json`);
    this.state = this.loadState();
  }

  loadState() {
    if (fs.existsSync(this.stateFilePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
      } catch (e) {}
    }
    return {
      date: this.date,
      currentState: STATES.UNINITIALIZED,
      completedStates: [],
      history: []
    };
  }

  saveState() {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  // Gate Check before Transitioning
  canTransitionTo(targetState) {
    const slotInfo = getCurrentSlotInfo();
    const currentMin = slotInfo.currentMin;

    console.log(`\n🚦 [LAYER 2 STATE MACHINE] Validating Transition to: ${targetState}`);
    console.log(`- Current Time: ${formatMinutes(currentMin)} | Current Slot: ${slotInfo.name} (${slotInfo.key})`);

    // Prerequisite Checklist
    const targetIdx = STATE_FLOW.indexOf(targetState);
    if (targetIdx > 0) {
      const requiredPrevState = STATE_FLOW[targetIdx - 1];
      const prevDone = this.state.completedStates.includes(requiredPrevState);
      
      // Allow Rule 72 recovery or verified completion
      if (!prevDone && targetState !== STATES.SLOT3_LIVE_FEEDS) {
        throw new Error(`[LAYER 2 BLOCK] PREVIOUS STATE INCOMPLETE: Cannot jump to ${targetState}. You MUST complete ${requiredPrevState} first!`);
      }
    }

    // Clock Window Assertions for Execution States
    if (targetState === STATES.SLOT4_CDP_DOM_AUDIT) {
      if (currentMin < 12 * 60 + 20 && slotInfo.key.startsWith('CYCLE1')) {
        throw new Error(`[LAYER 2 BLOCK] PREMATURE LEAP: Slot 4 Audit unlocks strictly at 12:20 PM IST. Current time is ${formatMinutes(currentMin)}.`);
      }
    } else if (targetState === STATES.SLOT5_EMAIL_DISPATCH) {
      if (currentMin < 13 * 60 + 0 && slotInfo.key.startsWith('CYCLE1')) {
        throw new Error(`[LAYER 2 BLOCK] PREMATURE LEAP: Slot 5 Email Dispatch unlocks strictly at 01:00 PM IST.`);
      }
    } else if (targetState === STATES.SLOT6_ATS_PORTALS) {
      if (currentMin < 13 * 60 + 30 && slotInfo.key.startsWith('CYCLE1')) {
        throw new Error(`[LAYER 2 BLOCK] PREMATURE LEAP: Slot 6 ATS Portals unlock strictly at 01:30 PM IST.`);
      }
    }

    console.log(`✅ [LAYER 2 STATE MACHINE] Transition to ${targetState} APPROVED.`);
    return true;
  }

  transitionTo(targetState) {
    this.canTransitionTo(targetState);
    this.state.currentState = targetState;
    this.state.history.push({
      state: targetState,
      timestamp: new Date().toISOString()
    });
    this.saveState();
  }

  markStateCompleted(completedState, metadata = {}) {
    if (!this.state.completedStates.includes(completedState)) {
      this.state.completedStates.push(completedState);
    }
    this.state.history.push({
      completed: completedState,
      timestamp: new Date().toISOString(),
      metadata
    });
    this.saveState();
    console.log(`🏁 [LAYER 2 STATE MACHINE] State ${completedState} Marked COMPLETED.`);
  }
}

module.exports = {
  PipelineStateMachine,
  STATES
};
