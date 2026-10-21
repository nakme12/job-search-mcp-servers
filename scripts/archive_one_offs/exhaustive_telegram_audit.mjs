import { harvestAllTelegram } from './harvest_all_tg.mjs';
import fs from 'fs';

async function exhaustiveScan() {
  const posts = await harvestAllTelegram();
  console.log(`\n=======================================================`);
  console.log(`🔍 EXHAUSTIVE TELEGRAM AUDIT (Total Posts: ${posts.length})`);
  console.log(`=======================================================`);

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const text = p.text || '';
    
    // Check if contains tech/web keywords
    const isTech = /\b(react|frontend|front-end|next\.?js|javascript|typescript|mern|web developer|ui developer|fullstack|full-stack|software engineer|sde|intern|node)\b/i.test(text);
    
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const urls = text.match(/https?:\/\/[^\s<"']+/g) || [];

    const cleanEmails = emails.filter(e => !e.includes('telegram') && !e.includes('example') && !e.includes('schema.org'));
    const cleanUrls = urls.filter(u => !u.includes('t.me') && !u.includes('telegram'));

    if (isTech && (cleanEmails.length > 0 || cleanUrls.length > 0)) {
      results.push({
        channel: p.channel,
        date: p.dateIso,
        emails: cleanEmails,
        urls: cleanUrls,
        snippet: text.slice(0, 140).replace(/\n+/g, ' ')
      });
    }
  }

  console.log(`Total Relevant Tech Leads Found in Telegram: ${results.length}`);
  results.forEach((r, idx) => {
    console.log(`\n[Lead ${idx + 1}/${results.length}] Channel: @${r.channel} (${r.date || 'Recent'})`);
    if (r.emails.length > 0) console.log(`  📧 Emails: ${r.emails.join(', ')}`);
    if (r.urls.length > 0) console.log(`  🔗 Links: ${r.urls.slice(0, 2).join(', ')}`);
    console.log(`  📝 Text: ${r.snippet}`);
  });

  fs.writeFileSync('scripts/exhaustive_tg_audit_dump.json', JSON.stringify(results, null, 2));
}

exhaustiveScan().catch(console.error);
