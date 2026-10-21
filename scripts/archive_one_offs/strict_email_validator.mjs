/**
 * STRICT APPLICATION DISPATCH PROTOCOL:
 * 1. MANDATORY HUMAN-AUDITED COMPANY NAME (NO "Gmail", NO DOMAIN GUESSING).
 * 2. EXACT JOB TITLE MATCHED TO THE JD.
 * 3. RESUME TYPE EXACTLY MATCHING THE ROLE (MERN Full Stack vs Frontend Engineer vs React Developer).
 * 4. PRE-FLIGHT VERIFICATION: Print Subject, Recipient, Body Salutation, and Resume Path BEFORE sending.
 * 5. SCREENSHOT AUDIT OF COMPOSE BOX BEFORE CLICKING SEND.
 */

export const BANNED_COMPANY_STRINGS = ['gmail', 'yahoo', 'outlook', 'hotmail', 'direct linkedin lead', 'tech firm', 'custom web agency', 'unknown'];

export function validateDispatchPayload(item) {
  if (!item.company || BANNED_COMPANY_STRINGS.includes(item.company.trim().toLowerCase())) {
    throw new Error(`CRITICAL QUALITY FAULT: Invalid company name "${item.company}". Never send generic salutations!`);
  }
  if (!item.email || !item.email.includes('@')) {
    throw new Error(`CRITICAL QUALITY FAULT: Invalid recipient email "${item.email}".`);
  }
  if (!item.role || item.role.trim().length < 4) {
    throw new Error(`CRITICAL QUALITY FAULT: Invalid job role "${item.role}".`);
  }
  if (!item.resume || !item.resume.endsWith('.pdf')) {
    throw new Error(`CRITICAL QUALITY FAULT: Missing or invalid resume attachment "${item.resume}".`);
  }
  return true;
}
