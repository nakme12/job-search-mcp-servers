/**
 * CANONICAL EMAIL TEMPLATE — RULE 44 (IMMUTABLE, USER-SEALED 2026-10-12)
 *
 * DO NOT ALTER A SINGLE WORD, PUNCTUATION, OR LINEBREAK.
 * ZERO BULLET POINTS. ZERO "Key Highlights".
 */

export function getCanonicalEmailBody(company, role) {
  if (!company || typeof company !== 'string' || !company.trim()) {
    throw new Error('FATAL: company name is required');
  }
  if (!role || typeof role !== 'string' || !role.trim()) {
    throw new Error('FATAL: role is required');
  }

  // Rule 42 Banned company keywords assertion
  const banned = ['gmail', 'yahoo', 'hotmail', 'outlook', 'direct linkedin lead', 'telegram lead', 'tech firm', 'unknown', 'null', 'hr manager'];
  const compLower = company.toLowerCase().trim();
  for (const b of banned) {
    if (compLower === b || compLower.startsWith(b + ' ') || compLower.endsWith(' ' + b)) {
      throw new Error(`FATAL: Disallowed company name detected: "${company}"`);
    }
  }

  return `Hi ${company.trim()} Hiring Team,

I came across your opening for a ${role.trim()} and wanted to apply for the role.

I'm a Full Stack Developer with 1.5 years of experience building full-stack web applications using React.js, Node.js, Express.js, MongoDB, TypeScript, REST APIs, and modern frontend & backend architectures.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;
}

export default getCanonicalEmailBody;
