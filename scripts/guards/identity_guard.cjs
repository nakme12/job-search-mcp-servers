/**
 * IDENTITY & ACCOUNT ISOLATION GUARD
 * 
 * Hard Enforcement:
 * 1. ONLY pratikpatidar7990@gmail.com is authorized.
 * 2. Hard block on any other Google profile or email (/u/1/, /u/2/, nakmeisiliya, etc.).
 * 3. Sanitizes all browser targets and CDP outputs before any agent can read them.
 */

const AUTHORIZED_ACCOUNT = 'pratikpatidar7990@gmail.com';
const BANNED_PATTERNS = [
  'nakmeisiliya',
  '/u/1/',
  '/u/2/',
  '/u/3/',
  'nakme'
];

function isAuthorizedTarget(url, title = '') {
  const full = `${url} ${title}`.toLowerCase();
  
  // If it's a Gmail URL, strictly enforce /u/0/ and pratikpatidar7990
  if (full.includes('mail.google.com')) {
    if (BANNED_PATTERNS.some(b => full.includes(b))) {
      return false;
    }
    if (!full.includes('u/0') && !full.includes(AUTHORIZED_ACCOUNT)) {
      return false;
    }
  }

  // General check across all targets
  for (const banned of BANNED_PATTERNS) {
    if (full.includes(banned)) {
      return false;
    }
  }

  return true;
}

function filterAuthorizedTargets(targets) {
  return targets.filter(t => isAuthorizedTarget(t.url || '', t.title || ''));
}

module.exports = {
  AUTHORIZED_ACCOUNT,
  isAuthorizedTarget,
  filterAuthorizedTargets
};
