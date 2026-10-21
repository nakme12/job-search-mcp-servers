import fs from 'fs';

const posts = JSON.parse(fs.readFileSync('devhub_all_dumped_posts.json', 'utf8'));

const jobs = [];
posts.forEach((p, idx) => {
  if (p.includes('Company:') || p.includes('Role:') || p.includes('Apply:')) {
    const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
    const getField = (prefix) => {
      const line = lines.find(l => l.toLowerCase().includes(prefix.toLowerCase()));
      return line ? line.replace(/^[^\w]+/, '').replace(new RegExp('^' + prefix + ':?', 'i'), '').trim() : '';
    };

    const company = getField('Company');
    const role = getField('Role');
    const exp = getField('Experience');
    const loc = getField('Location');
    const apply = lines.find(l => l.includes('http') || l.includes('@')) || '';

    jobs.push({
      id: idx + 1,
      company,
      role,
      exp,
      loc,
      apply,
      fullText: p
    });
  }
});

console.log('Total jobs identified:', jobs.length);
fs.writeFileSync('devhub_parsed_jobs.json', JSON.stringify(jobs, null, 2));

jobs.forEach(j => {
  console.log(`[Job ${j.id}] ${j.company} | ${j.role} | Exp: ${j.exp} | Loc: ${j.loc} | Link: ${j.apply.slice(0, 70)}`);
});
