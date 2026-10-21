const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== [DEEP TELEGRAM EMAIL HARVESTER] Starting deep scroll ===');
  
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const targetChannels = ['merntech', 'techjobsalert', 'placementlelo', 'freshersvoice', 'freshershunt'];
  const allQualifiedEmails = [];
  const now = new Date();
  
  for (const ch of targetChannels) {
    const url = 'https://t.me/s/' + ch;
    console.log('\nDeep scrolling channel: @' + ch + '...');
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Deep scroll up 8 times to load up to 100-150 older posts from the past 7 days
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 1200));
      }
      
      const channelPosts = await page.evaluate(() => {
        const wraps = Array.from(document.querySelectorAll('.tgme_widget_message_wrap'));
        return wraps.map(w => {
          const textEl = w.querySelector('.tgme_widget_message_text');
          const timeEl = w.querySelector('.tgme_widget_message_date time');
          return {
            text: textEl ? textEl.innerText.trim() : '',
            datetime: timeEl ? timeEl.getAttribute('datetime') : null
          };
        }).filter(p => p.text.length > 20);
      });
      
      console.log('  Loaded ' + channelPosts.length + ' raw posts from @' + ch);
      
      let count = 0;
      for (const p of channelPosts) {
        const text = p.text;
        
        // Check email
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (!emailMatch) continue;
        const email = emailMatch[0].toLowerCase();
        
        // Filter out bot/channel/admin support emails
        if (/telegram|support@|admin@liftor\.in|contact@freshers/i.test(email)) continue;
        
        // Freshness: last 7-10 days
        if (p.datetime) {
          const diffDays = (now - new Date(p.datetime)) / (1000 * 60 * 60 * 24);
          if (diffDays > 8) continue;
        }
        
        // Stack check
        const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|fullstack|web dev|javascript|next\.?js|ui engineer|software engineer|sde/i.test(text);
        if (!isStack) continue;
        
        // Hard ban
        const isBanned = /react native|flutter|android developer|ios developer|devops engineer|cloud engineer/i.test(text);
        if (isBanned) continue;
        
        // YOE ceiling: allow 0-2, 0-3, 0-4, freshers; reject 5+, 6+, senior, lead
        const isSenior = /\b(5\+|6\+|7\+|8\+|senior|lead|architect|principal|manager)\b/i.test(text);
        const highRange = text.match(/\b([4-9]|\d{2})\s*(?:-|to|–)\s*([0-9]+)\s*(?:years|yrs|yoe)\b/i);
        if (isSenior || highRange) continue;
        
        // Extract company
        let comp = 'Hiring Team';
        const compMatch = text.match(/(?:Company|🏢 Company|Organisation|Org):\s*([^\n|]+)/i);
        if (compMatch) comp = compMatch[1].trim();
        else {
          const firstLine = text.split('\n')[0].replace(/🚀|🔥|HIRING|ALERT|URGENT|\|/gi, '').trim();
          if (firstLine.length > 2 && firstLine.length < 35) comp = firstLine;
        }
        
        // Avoid "Hi Gmail" or generic company name per Rule 1
        if (/gmail|yahoo|outlook|direct lead|null|unknown/i.test(comp)) {
          comp = 'Tech Hiring Team';
        }
        
        // Role
        let role = 'Full Stack Developer';
        if (/frontend|react/i.test(text)) role = 'Frontend Developer (React)';
        else if (/mern/i.test(text)) role = 'MERN Stack Developer';
        
        let resume = 'Pratik Patidar Resume - React Developer.pdf';
        if (/mern|full stack/i.test(text)) resume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
        
        allQualifiedEmails.push({
          id: 'tg_email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          company: comp,
          role: role,
          recipient: email,
          application_type: 'Direct Recruiter Email',
          source: 'Telegram (@' + ch + ')',
          resume_mapped: resume,
          date_posted: p.datetime || new Date().toISOString(),
          status: 'VERIFIED_AUDITED',
          raw_text: text
        });
        count++;
      }
      console.log('  -> Found ' + count + ' qualified direct recruiter emails in @' + ch);
    } catch (e) {
      console.error('  Error on @' + ch + ':', e.message);
    }
  }
  
  await page.close();
  
  // Deduplicate by recipient email
  const seenEmails = new Set();
  const deduped = [];
  for (const item of allQualifiedEmails) {
    if (!seenEmails.has(item.recipient)) {
      seenEmails.add(item.recipient);
      deduped.push(item);
    }
  }
  
  console.log('\n======================================================');
  console.log('🎯 TOTAL UNIQUE QUALIFIED FRESH RECRUITER EMAILS: ' + deduped.length);
  console.log('======================================================');
  deduped.forEach((d, idx) => {
    console.log((idx + 1) + '. [' + d.company + '] ' + d.role + ' -> ' + d.recipient);
  });
  
  // Save to file
  const outPath = path.resolve(__dirname, 'deep_harvested_emails.json');
  fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));
  console.log('\nSaved to: ' + outPath);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
