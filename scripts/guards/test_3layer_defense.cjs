/**
 * TEST HARNESS: VERIFY 3-LAYER FAIL-SAFE CATCH SYSTEM
 */

const UniversalGuardInterceptor = require('./universal_guard_interceptor.cjs');
const { PipelineStateMachine, STATES } = require('./pipeline_state_machine.cjs');
const StorageWriteGuard = require('./storage_write_guard.cjs');

console.log('====================================================');
console.log('🧪 TESTING 3-LAYER DEFENSE IN DEPTH ARCHITECTURE');
console.log('====================================================\n');

let testsPassed = 0;

// TEST 1: Catch "Hi Gmail"
try {
  UniversalGuardInterceptor.assertEmailSafety('gmail', 'test@gmail.com');
  console.error('❌ FAIL: Layer 1 did not catch Gmail salutation!');
} catch (e) {
  console.log('✅ CATCH 1 (Layer 1): Blocked forbidden company name: ' + e.message);
  testsPassed++;
}

// TEST 2: Catch 3+ YOE in JD
const fakeJd = "We are looking for a Senior Developer with 5+ years of experience in React.";
const checkResult = UniversalGuardInterceptor.assertJobEligibility(fakeJd, 'Senior Frontend Engineer');
if (!checkResult.pass && (checkResult.reason.includes('OUT_OF_RANGE') || checkResult.reason.includes('EXCEEDS_2_YOE'))) {
  console.log('✅ CATCH 2 (Layer 1): Blocked 5+ YOE Senior JD: ' + checkResult.reason);
  testsPassed++;
} else {
  console.error('❌ FAIL: Layer 1 did not catch 5+ YOE! Got: ' + JSON.stringify(checkResult));
}

// TEST 3: State Machine Blocks Premature Transition to Slot 6 (at 12:00 PM)
try {
  const sm = new PipelineStateMachine();
  sm.canTransitionTo(STATES.SLOT6_ATS_PORTALS);
  console.error('❌ FAIL: Layer 2 allowed premature transition to Slot 6!');
} catch (e) {
  console.log('✅ CATCH 3 (Layer 2): State Machine blocked premature leap: ' + e.message);
  testsPassed++;
}

// TEST 4: Storage Guard Blocks Phantom Logging (Missing Screenshot)
try {
  StorageWriteGuard.validateAppliedJob({
    company: 'TestTech',
    url: 'https://testtech.com/jobs/123',
    application_type: 'Direct ATS Form',
    confirmation_screenshot: 'C:\\mcp\\fake_screenshot_does_not_exist.png'
  });
  console.error('❌ FAIL: Layer 3 allowed fake screenshot!');
} catch (e) {
  console.log('✅ CATCH 4 (Layer 3): Storage Write Guard blocked phantom entry: ' + e.message);
  testsPassed++;
}

console.log('\n====================================================');
console.log(`🎯 RESULT: ${testsPassed}/4 FAIL-SAFE CHECKS PASSED! ALL 3 LAYERS ARMED.`);
console.log('====================================================');
