import fs from 'fs';

const applied = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8')).applied;
const emailsSent = applied.map(a => a.recipientEmail || a.email || '').filter(Boolean).map(e => e.toLowerCase());

const targets = [
  { company: 'Elevate Tech', role: 'Full Stack / MERN Developer', exp: '1+ Years', email: 'careers@elevatetech.in', resume: 'MERN Full Stack' },
  { company: 'Axquora', role: 'Frontend Developer', exp: '1+ Year', email: 'hr@axquora.com', resume: 'Frontend Engineer' },
  { company: 'Cybersify', role: 'Full Stack Developer', exp: '1+ Year', email: 'hr@cybersify.tech', resume: 'MERN Full Stack' },
  { company: 'Liftor', role: 'Full Stack / React Native Developer', exp: '1.5-2+ Years', email: 'admin@liftor.in', resume: 'MERN Full Stack' },
  { company: 'Recharge Studio', role: 'React Native / Frontend Developer', exp: '1-3 Years', email: 'sakshi.yadav@reachargestudio.com', resume: 'React Developer' },
  { company: 'Tech Erudite', role: 'MERN Stack Developer', exp: '1+ Year', email: 'techerudite.career@gmail.com', resume: 'MERN Full Stack' }
];

targets.forEach(t => {
  const already = emailsSent.includes(t.email.toLowerCase());
  console.log(t.company + ' (' + t.email + ') -> Already applied: ' + already);
});
