const assert = require('assert');
const UniversalGuardInterceptor = require('../scripts/guards/universal_guard_interceptor.cjs');
const { CANONICAL_PATHS } = require('../scripts/canonical_paths.cjs');

async function testAll() {
  console.log('🧪 Running Verification Tests on Fixes...\n');

  // Test 1: Broad ranges (0-4, 2-4, 2-5) MUST PASS
  console.log('Test 1: Broad ranges (0-4, 2-4, 2-5 YOE)...');
  const jd0to4 = 'We are hiring a Frontend Developer. Experience required: 0-4 years in React and Next.js. Competitive salary.';
  const res1 = UniversalGuardInterceptor.assertJobEligibility(jd0to4, 'Frontend Developer');
  assert.strictEqual(res1.pass, true, '0-4 years should pass!');
  console.log('  ✅ 0-4 years passed!');

  const jd2to4 = 'Looking for React Engineer. 2-4 years experience. Indore / Remote. Salary 5-8 LPA.';
  const res2 = UniversalGuardInterceptor.assertJobEligibility(jd2to4, 'React Developer');
  assert.strictEqual(res2.pass, true, '2-4 years should pass!');
  console.log('  ✅ 2-4 years passed!');

  // Test 2: Seniority in JD body (reporting to lead/manager) MUST PASS
  console.log('\nTest 2: Seniority words in JD body (not in title)...');
  const jdWithLead = 'Junior Frontend Developer role. You will report to the Tech Lead and collaborate with the Engineering Manager. Experience: 1-2 years.';
  const res3 = UniversalGuardInterceptor.assertJobEligibility(jdWithLead, 'Junior Frontend Developer');
  assert.strictEqual(res3.pass, true, 'Reporting to tech lead should NOT fail eligibility!');
  console.log('  ✅ JD with "tech lead" & "manager" passed!');

  // Test 3: Hard Senior / 5+ YOE MUST FAIL
  console.log('\nTest 3: Hard 5+ YOE and Senior Title...');
  const jdSenior = 'Senior Frontend Engineer with minimum 5+ years of experience.';
  const res4 = UniversalGuardInterceptor.assertJobEligibility(jdSenior, 'Senior Frontend Engineer');
  assert.strictEqual(res4.pass, false, 'Senior role should fail!');
  console.log('  ✅ Senior 5+ YOE correctly rejected!');

  // Test 4: CANONICAL_PATHS dynamic resolution
  console.log('\nTest 4: CANONICAL_PATHS resolution...');
  const file3 = CANONICAL_PATHS.getFile3Today('2026-10-26');
  const file1 = CANONICAL_PATHS.getFile1Historical();
  assert(file3.includes('total_todays_2026-10-26.json'), 'File 3 path resolved');
  assert(file1.includes('total_historical_except_today.json'), 'File 1 path resolved');
  console.log('  ✅ CANONICAL_PATHS verified:', file3);

  console.log('\n🎉 ALL 4 TEST SUITES PASSED FLAWLESSLY!');
}

testAll().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
