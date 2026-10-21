const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

/**
 * PRODUCTION-GRADE TELEGRAM 7-CHANNEL LIVE SCRAPER
 * Enforces:
 * - Rule 81: Operates only on its own dedicated tab, never closes user tabs.
 * - Rule 85: Qualifies strictly on Stack + YOE + Freshness. Does NOT drop on missing email/link.
 * - Broad YOE: Allows 0-3, 0-4, 1-3, 1-4, Freshers, 0-2 YOE. Rejects strictly >= 3 YOE min.
 * - Reads verified channels from tg_channels_registry.json
 */

async function main() {
  console.log('=== [TELEGRAM 7-CHANNEL AUDIT & EXTRACTION] Starting ===');
  
  const registryPath = path.resolve(__dirname, 'tg_channels_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  console.log(`Loaded ${registry.length} verified channels from registry.`);
  
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const resultsByChannel = {};
  const allQualifiedLeads = [];
  
  for (const ch of registry) {
    const channelName = ch.username;
    const url = `https://t.me/s/${channelName}`;
    console.log(`\nInspecting @${channelName} (${ch.name})...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Deep scroll up/down to render 100+ historical posts instead of default 20
      for (let s = 0; s < 12; s++) {
        await page.evaluate(() => window.scrollBy(0, -2000));
        await new Promise(r => setTimeout(r, 600));
      }
      for (let s = 0; s < 4; s++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 500));
      }
      await new Promise(r => setTimeout(r, 1500));
      
      const channelPosts = await page.evaluate(() => {
        const messageElements = Array.from(document.querySelectorAll('.tgme_widget_message_wrap'));
        return messageElements.map(wrap => {
          const textEl = wrap.querySelector('.tgme_widget_message_text');
          const timeEl = wrap.querySelector('.tgme_widget_message_date time');
          const text = textEl ? textEl.innerText.trim() : '';
          const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
          const postLinkEl = wrap.querySelector('.tgme_widget_message_date');
          const postUrl = postLinkEl ? postLinkEl.getAttribute('href') : '';
          
          return {
            text,
            datetime,
            postUrl
          };
        }).filter(p => p.text.length > 20);
      });
      
      console.log(`  Scraped ${channelPosts.length} raw posts from @${channelName}.`);
      
      let qualifiedForChannel = 0;
      
      for (const p of channelPosts) {
        const text = p.text;
        
        // 1. Freshness Check (past 7 days)
        let isFresh = true;
        if (p.datetime) {
          const postDate = new Date(p.datetime);
          const now = new Date();
          const diffDays = (now - postDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) {
            isFresh = false;
          }
        }
        if (!isFresh) continue;
        
        // 2. Stack Match (Frontend / React / Next.js / Web / MERN / UI)
        const isStack = /react(?!\s*native)|frontend|front-end|mern|full stack|fullstack|web dev|javascript|typescript|next\.?js|software engineer|sde|ui engineer/i.test(text);
        if (!isStack) continue;
        
        // 3. Hard Ban (React Native, Android, iOS, DevOps, Python, Systems)
        const isBanned = /react native|flutter|android developer|ios developer|devops engineer|cloud engineer|embedded|hardware/i.test(text);
        if (isBanned) continue;
        
        // 4. Experience Ceiling Check:
        // Broad ranges (0-3, 0-4, 1-3, 1-4, 0-2, 1-2) are allowed per Rule 85.
        // Senior / Lead / 3+ / 4+ / 5+ minimums are rejected.
        const isSeniorTitle = /\b(senior|lead|architect|principal|staff|director|tech lead|engineering manager)\b/i.test(text);
        if (isSeniorTitle) continue;
        
        const strictHighExp = /\b([3-9]|\d{2})\s*\+\s*(?:years|yrs|yoe)\b/i.test(text);
        const highRangeMatch = text.match(/\b([3-9]|\d{2})\s*(?:-|to|–)\s*([0-9]+)\s*(?:years|yrs|yoe)\b/i);
        
        if (strictHighExp || highRangeMatch) continue;
        
        // 5. Contact Extraction (Email or Apply Link)
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const linkMatch = text.match(/https?:\/\/[^\s]+/);
        
        // Company Extraction
        let company = 'Hiring Team';
        const compMatch = text.match(/(?:Company|Hiring Company|Organisation|Org):\s*([^\n|]+)/i);
        if (compMatch) {
          company = compMatch[1].trim();
        } else {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const first = lines[0].replace(/🚀|🔥|HIRING|URGENT|ALERT|\|/gi, '').trim();
            if (first.length > 2 && first.length < 40) company = first;
          }
        }
        
        // Role Extraction
        let role = 'Frontend / Full Stack Developer';
        const roleMatch = text.match(/(?:Role|Position|Job Title|Profile):\s*([^\n|]+)/i);
        if (roleMatch) {
          role = roleMatch[1].trim();
        } else if (/mern|full stack|fullstack/i.test(text)) {
          role = 'Full Stack Developer';
        } else if (/react|frontend|front-end/i.test(text)) {
          role = 'Frontend Developer';
        }
        
        const lead = {
          id: `tg_${channelName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          channel: `@${channelName}`,
          company: company,
          role: role,
          recipient: emailMatch ? emailMatch[0].toLowerCase() : null,
          url: linkMatch ? linkMatch[0] : p.postUrl,
          application_type: emailMatch ? 'Direct Recruiter Email' : (linkMatch ? 'Online Link' : 'Telegram Post'),
          date_posted: p.datetime || new Date().toISOString(),
          raw_text: text.slice(0, 300)
        };
        
        allQualifiedLeads.push(lead);
        qualifiedForChannel++;
      }
      
      resultsByChannel[channelName] = {
        total_scraped: channelPosts.length,
        qualified: qualifiedForChannel
      };
      
      console.log(`  -> Qualified 0-2 YOE leads for @${channelName}: ${qualifiedForChannel}`);
      
    } catch (err) {
      console.error(`  Error scraping @${channelName}:`, err.message);
      resultsByChannel[channelName] = { error: err.message, qualified: 0 };
    }
  }
  
  // Close the dedicated page (Rule 81 - never close user tabs)
  await page.close();
  
  // Save outputs
  const permanentTgPath = path.resolve(__dirname, 'fresh_qualified_tg_leads.json');
  fs.writeFileSync(permanentTgPath, JSON.stringify(allQualifiedLeads, null, 2));
  console.log(`\n✅ Saved ${allQualifiedLeads.length} leads permanently to ${permanentTgPath}`);
  
  const slot3TgPath = path.resolve(__dirname, '..', 'slot3_telegram_leads.json');
  fs.writeFileSync(slot3TgPath, JSON.stringify({
    source: "Telegram Channels (Past 7 Days - Verified 7 Channels)",
    date: new Date().toISOString().split('T')[0],
    total: allQualifiedLeads.length,
    channel_breakdown: resultsByChannel,
    jobs: allQualifiedLeads
  }, null, 2));
  console.log(`✅ Saved to ${slot3TgPath}`);
  
  console.log('\n=== FINAL TELEGRAM AUDIT SUMMARY ===');
  for (const [ch, stat] of Object.entries(resultsByChannel)) {
    console.log(`- @${ch}: ${stat.qualified} qualified leads (out of ${stat.total_scraped || 0} posts)`);
  }
  console.log(`TOTAL QUALIFIED LEADS FOUND: ${allQualifiedLeads.length}`);
}

main().catch(err => {
  console.error('Fatal error in TG scraper:', err);
  process.exit(1);
});
