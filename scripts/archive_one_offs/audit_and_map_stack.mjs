import fs from 'fs';
import path from 'path';

const rawPool = JSON.parse(fs.readFileSync('scripts/ready_for_dispatch_batch.json', 'utf8'));

// Strict Stack & Experience Mapping Function (Rule 3, 17, 32)
function categorizeAndMapResume(job) {
  const title = (job.title || '').toLowerCase();
  const desc = (job.description_snippet || '').toLowerCase();
  const text = `${title} ${desc}`;

  // 1. Hard Disqualify: Internships, Trainees, B2B, Senior
  if (
    title.includes('intern') ||
    title.includes('trainee') ||
    text.includes('unpaid') ||
    text.includes('stipend') ||
    text.includes('3+ years') ||
    text.includes('4+ years') ||
    text.includes('5+ years') ||
    title.includes('senior') ||
    title.includes('lead') ||
    title.includes('principal') ||
    title.includes('architect')
  ) {
    return { pass: false, reason: 'Disqualified (Internship / Senior / Multi-year barrier)' };
  }

  // 2. MERN Full Stack
  if (text.includes('mern') || (text.includes('node') && text.includes('react')) || title.includes('full stack') || title.includes('fullstack')) {
    return {
      pass: true,
      category: 'MERN Full Stack',
      targetResume: 'Pratik Patidar Resume - MERN Full Stack (Updated).pdf',
      subjectTemplate: `Application for Full Stack Developer - Pratik Patidar`
    };
  }

  // 3. React Developer Specialist
  if (title.includes('react developer') || title.includes('react.js developer') || title.includes('reactjs developer') || (text.includes('redux') && text.includes('react'))) {
    return {
      pass: true,
      category: 'React Developer',
      targetResume: 'Pratik Patidar Resume - React Developer (Updated).pdf',
      subjectTemplate: `Application for React Developer - Pratik Patidar`
    };
  }

  // 4. Frontend / UI / Next.js / TypeScript Engineer
  if (text.includes('frontend') || text.includes('front end') || text.includes('ui developer') || text.includes('next.js') || text.includes('typescript')) {
    return {
      pass: true,
      category: 'Frontend Engineer',
      targetResume: 'Pratik Patidar Resume - Frontend Engineer (Updated).pdf',
      subjectTemplate: `Application for Frontend Engineer - Pratik Patidar`
    };
  }

  return { pass: false, reason: 'Stack mismatch' };
}

const auditedPool = [];
const disqualified = [];

for (const j of rawPool) {
  const evalResult = categorizeAndMapResume(j);
  if (evalResult.pass) {
    auditedPool.push({
      ...j,
      category: evalResult.category,
      targetResume: evalResult.targetResume,
      subjectTemplate: evalResult.subjectTemplate
    });
  } else {
    disqualified.push({ company: j.company, title: j.title, reason: evalResult.reason });
  }
}

console.log(`[SLOT 4 AUDIT] Total Qualified: ${auditedPool.length} | Disqualified: ${disqualified.length}`);
fs.writeFileSync('scripts/slot4_stack_audited_pool.json', JSON.stringify(auditedPool, null, 2));

console.log('\n--- SAMPLE MAPPED TARGETS ---');
auditedPool.slice(0, 10).forEach((j, i) => {
  console.log(`${i + 1}. [${j.category}] ${j.company} -> ${j.title}`);
  console.log(`   Resume: ${j.targetResume}`);
});
