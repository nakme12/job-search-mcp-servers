/**
 * GUARD 1: Slot Clock Barrier
 * Enforces strict timetable windows. Throws hard exit if invoked out of schedule.
 */
const { assertSlot, getCurrentSlotInfo, formatMinutes, SCHEDULE } = require('../slot_guard.cjs');

module.exports = {
  assertSlot,
  getCurrentSlotInfo,
  formatMinutes,
  SCHEDULE
};
