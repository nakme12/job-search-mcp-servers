/**
 * GUARD 3: Strict Screening Data Enforcer (Incident 22 Fix)
 * Completely eliminates arbitrary guessing or hardcoded CTC/Notice period in form submissions.
 */

const fs = require('fs');
const path = require('path');

const PROFILE_PATH = path.resolve(__dirname, '../../candidate_screening_profile.json');

function loadCanonicalProfile() {
  if (!fs.existsSync(PROFILE_PATH)) {
    console.error(`🛑 HARD BLOCK: candidate_screening_profile.json NOT FOUND!`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')).profile;
}

const CANONICAL = loadCanonicalProfile();

function assertCanonicalValue(fieldKey, valueProvided) {
  const normProvided = String(valueProvided).trim().toLowerCase();

  switch (fieldKey) {
    case 'current_ctc':
      if (!normProvided.includes('2.16') && !normProvided.includes('216000')) {
        console.error(`🛑 HARD BLOCK: Current CTC mismatch! Provided: "${valueProvided}", Required: "2.16 LPA"`);
        process.exit(1);
      }
      break;

    case 'expected_ctc':
      if (!normProvided.includes('4.65') && !normProvided.includes('465000')) {
        console.error(`🛑 HARD BLOCK: Expected CTC mismatch! Provided: "${valueProvided}", Required: "4.65 LPA"`);
        process.exit(1);
      }
      break;

    case 'notice_period':
      if (!normProvided.includes('15') && !normProvided.includes('immediate')) {
        console.error(`🛑 HARD BLOCK: Notice Period mismatch! Provided: "${valueProvided}", Required: "15 Days"`);
        process.exit(1);
      }
      break;

    case 'total_experience':
      if (!normProvided.includes('1.5') && !normProvided.includes('2')) {
        console.error(`🛑 HARD BLOCK: Experience mismatch! Provided: "${valueProvided}", Required: "1.5 - 2 Years"`);
        process.exit(1);
      }
      break;

    case 'country_code':
      if (normProvided !== '+91' && normProvided !== '91' && normProvided !== 'india (+91)') {
        console.error(`🛑 HARD BLOCK: Country code mismatch! Provided: "${valueProvided}", Required: "+91" (India)`);
        process.exit(1);
      }
      break;
  }

  return true;
}

module.exports = {
  assertCanonicalValue,
  CANONICAL
};
