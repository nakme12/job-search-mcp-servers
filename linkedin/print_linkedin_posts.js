import fs from 'fs';

const posts = JSON.parse(fs.readFileSync('linkedin_mern_posts.json', 'utf8'));

console.log('Total extracted LinkedIn posts:', posts.length);
posts.forEach((p, i) => {
  console.log(`[Post ${i+1}]`);
  console.log('Emails:', p.emails.join(', ') || 'No direct email');
  console.log('Snippet:', p.snippet);
  console.log('--------------------------------------------------');
});
