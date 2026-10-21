import puppeteer from 'puppeteer-core';
import fs from 'fs';

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
  const filtered = matches.filter(e => {
    const el = e.toLowerCase();
    return !el.endsWith('.png') && !el.endsWith('.jpg') && !el.endsWith('.jpeg') &&
           !el.includes('example.com') && !el.includes('sample.com') && !el.includes('test.com') &&
           !el.includes('yourcompany.com') && !el.includes('domain.com');
  });
  return Array.from(new Set(filtered));
}

function isIndianLocation(text) {
  const t = text.toLowerCase();
  const indianCities = [
    'india', 'indore', 'bangalore', 'bengaluru', 'pune', 'noida', 'ahmedabad',
    'gurgaon', 'gurugram', 'hyderabad', 'mumbai', 'delhi', 'chennai', 'kolkata',
    'jaipur', 'chandigarh', 'kochi', 'surat', 'bhopal', 'vadodara', 'remote',
    'work from home', 'wfh', 'pan india'
  ];
  if (t.includes('us only') || t.includes('usa only') || t.includes('c2c') || t.includes('w2 only')) {
    return false;
  }
  return indianCities.some(c => t.includes(c));
}

function evaluatePost(post) {
  const t = post.fullText.toLowerCase();

  // 1. Must NOT be job seeker
  const seekerPhrases = [
    'open to work', 'opentowork', 'looking for new opportunities', 'seeking new opportunities',
    'looking for a new role', 'seeking a new role', 'open to new opportunities', 'open for new opportunities',
    'actively looking for', 'i am looking for a job', 'im looking for a job', 'looking for job change',
    'looking for an opportunity', 'open to opportunities'
  ];
  for (const sp of seekerPhrases) {
    if (t.includes(sp)) return { ok: false, reason: 'Seeker post' };
  }

  // 2. Must be hiring post
  const hiringPhrases = [
    'hiring', 'looking for', 'urgent requirement', 'immediate requirement',
    'we are looking', 'we are hiring', 'opening for', 'job opening', 'opportunity for',
    'urgent opening', 'seeking candidates', 'send your resume', 'share your resume',
    'share cv', 'send cv', 'mail your resume'
  ];
  const isHiring = hiringPhrases.some(hp => t.includes(hp));
  if (!isHiring) return { ok: false, reason: 'Not hiring post' };

  // 3. Must be relevant role: React, Frontend, MERN
  const hasReact = t.includes('react');
  const hasFrontend = t.includes('frontend') || t.includes('front-end') || t.includes('front end');
  const hasMern = t.includes('mern');
  if (!hasReact && !hasFrontend && !hasMern) return { ok: false, reason: 'Not React/Frontend/MERN' };

  // 4. Must NOT be Senior / Lead / Principal / Architect
  if (t.includes('lead developer') || t.includes('tech lead') || t.includes('team lead') ||
      t.includes('principal') || t.includes('architect') || t.includes('director') ||
      t.includes('senior developer') || t.includes('sr. developer') || t.includes('sr developer') ||
      t.includes('senior react') || t.includes('sr react') || t.includes('senior frontend') ||
      t.includes('sr frontend') || t.includes('senior full stack') || t.includes('sr full stack')) {
    return { ok: false, reason: 'Senior/Lead role' };
  }

  // 5. Must NOT be 3+ YOE
  const highExpPhrases = ['3+ years', '3+ yoe', '3-5 years', '3 to 5 years', '4+ years', '4-6 years', '5+ years', '5+ yoe', '6+ years', '7+ years', '8+ years', '9+ years', '10+ years', '4 to 6 years'];
  for (const hep of highExpPhrases) {
    if (t.includes(hep)) return { ok: false, reason: 'High experience (3+ YOE)' };
  }

  // Check specific experience patterns
  let expText = '0-2 YOE / Junior / Fresher';
  const expMatch = t.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?|yoe)/i) || t.match(/(\d+)\+?\s*(?:years?|yrs?|yoe)/i);
  if (expMatch) {
    if (expMatch[2]) {
      const min = parseInt(expMatch[1], 10);
      const max = parseInt(expMatch[2], 10);
      if (min >= 3) return { ok: false, reason: `Min experience ${min} >= 3` };
      expText = `${min}-${max} Years`;
    } else {
      const val = parseInt(expMatch[1], 10);
      if (val >= 3) return { ok: false, reason: `Experience ${val}+ >= 3` };
      expText = `${val}+ Years`;
    }
  }

  // 6. Filter US staffing / C2C / W2
  if (t.includes('c2c') || t.includes('w2 only') || t.includes('corp to corp') || t.includes('corp-to-corp') ||
      t.includes('us citizen') || t.includes('green card') || t.includes('us staffing') || t.includes('est timezone') ||
      t.includes('pst timezone') || t.includes('cst timezone')) {
    return { ok: false, reason: 'US staffing / C2C / W2' };
  }

  // 7. Must be Indian location or Remote
  if (!isIndianLocation(t)) return { ok: false, reason: 'Not India / Remote' };

  // 8. Must extract real email
  const emails = extractEmails(post.fullText);
  if (emails.length === 0) return { ok: false, reason: 'No email found' };

  return { ok: true, expText, emails };
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  if (!page) { console.error('No LinkedIn tab found'); process.exit(1); }

  const queries = [
    'React hiring "resume" India',
    'Frontend hiring "resume" India',
    'MERN hiring "resume" India',
    'React "share your resume" India',
    'Frontend "share your resume" India',
    'MERN "share your resume" India',
    'React developer "send cv" India',
    'Frontend developer "send cv" India',
    'React hiring Indore OR Ahmedabad OR Pune OR Noida',
    'React "0-2 years" OR "1-2 years" hiring India',
    'Frontend "0-2 years" OR "1-2 years" hiring India',
    'MERN "0-2 years" OR "1-2 years" hiring India',
    'React developer hiring "@gmail.com" India',
    'Frontend developer hiring "@gmail.com" India',
    'React "immediate joiner" resume India',
    'Frontend "immediate joiner" resume India'
  ];

  const verifiedLeads = new Map();

  for (const q of queries) {
    if (verifiedLeads.size >= 13) break;

    const url = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(q)}&sortBy=%22date_posted%22`;
    console.log(`\n========================================`);
    console.log(`Searching query: "${q}"`);
    console.log(`Current verified count: ${verifiedLeads.size}/13`);
    console.log(`========================================`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 3500));

      // Click "Load more" up to 10 times to populate 30+ posts
      for (let lm = 0; lm < 10; lm++) {
        const clicked = await page.evaluate(() => {
          const main = document.querySelector('main');
          if (main) main.scrollTop = main.scrollHeight;
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'load more');
          if (btn) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            btn.click();
            return true;
          }
          return false;
        });
        if (!clicked) break;
        await new Promise(r => setTimeout(r, 1800));
      }

      // Expand all "...more" buttons
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        btns.forEach(b => {
          const t = (b.innerText || '').trim().toLowerCase();
          if (t === 'more' || t === '… more' || t.includes('see more')) {
            try { b.click(); } catch(e){}
          }
        });
      });
      await new Promise(r => setTimeout(r, 1200));

      // Parse all visible feed posts
      const rawPosts = await page.evaluate(() => {
        const h2s = Array.from(document.querySelectorAll('h2')).filter(h => (h.innerText || '').trim() === 'Feed post');
        return h2s.map(h2 => {
          const container = h2.closest('div.gfllid') || h2.parentElement;
          const fullText = container ? container.innerText : '';
          const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

          let author = '';
          let authorTitle = '';
          let dateStr = '';

          if (lines.length > 1) author = lines[1];
          if (lines.length > 2) {
            if (lines[2].startsWith('•') || lines[2].includes('1st') || lines[2].includes('2nd') || lines[2].includes('3rd')) {
              authorTitle = lines[3] || '';
              dateStr = lines[4] || '';
            } else {
              authorTitle = lines[2];
              dateStr = lines[3] || '';
            }
          }
          dateStr = dateStr.replace(/•.*$/g, '').trim();

          return { author, authorTitle, dateStr, fullText };
        });
      });

      console.log(`Parsed ${rawPosts.length} posts on page.`);

      for (const p of rawPosts) {
        if (!p.fullText || p.fullText.length < 50) continue;

        const evalRes = evaluatePost(p);
        if (evalRes.ok) {
          const primaryEmail = evalRes.emails[0].toLowerCase();
          if (verifiedLeads.has(primaryEmail)) continue;

          // Extract company name
          let company = '';
          const text = p.fullText;
          const compMatch = text.match(/(?:company|organization|at|client)\s*[:\-–]\s*([A-Za-z0-9&.,\s]{2,40})/i) ||
                            text.match(/(?:we at|hiring at|looking for at)\s+([A-Za-z0-9&.,\s]{2,40})/i) ||
                            p.authorTitle.match(/(?:at|@)\s+([A-Za-z0-9&.,\s]{2,35})/i);
          if (compMatch) {
            company = compMatch[1].trim().split('\n')[0].replace(/[|•,].*$/, '').trim();
          } else if (p.authorTitle.includes('Founder') || p.authorTitle.includes('HR') || p.authorTitle.includes('Recruiter')) {
            company = p.authorTitle.split('|')[0].trim();
          } else {
            company = 'Direct Tech Hiring';
          }

          // Clean role title
          let role = 'Frontend / React Developer';
          const tLower = text.toLowerCase();
          if (tLower.includes('mern stack developer') || tLower.includes('mern developer')) role = 'MERN Stack Developer';
          else if (tLower.includes('react.js developer') || tLower.includes('reactjs developer') || tLower.includes('react developer')) role = 'React.js Developer';
          else if (tLower.includes('frontend developer') || tLower.includes('front end developer')) role = 'Frontend Developer';
          else if (tLower.includes('full stack developer') || tLower.includes('fullstack developer')) role = 'Full Stack Developer (React / MERN)';

          // Extract location
          let loc = 'India / Remote';
          const locs = ['Indore', 'Bangalore', 'Bengaluru', 'Pune', 'Noida', 'Ahmedabad', 'Gurgaon', 'Gurugram', 'Hyderabad', 'Mumbai', 'Chennai', 'Remote'];
          for (const l of locs) {
            if (tLower.includes(l.toLowerCase())) {
              loc = l;
              break;
            }
          }

          const lead = {
            id: verifiedLeads.size + 1,
            role,
            experience: evalRes.expText,
            location: loc,
            company_name: company,
            author_name: p.author,
            author_title: p.authorTitle,
            hr_email: primaryEmail,
            all_emails: evalRes.emails,
            post_date: p.dateStr || 'Recent',
            post_snippet: p.fullText.replace(/\n+/g, ' ').slice(0, 300) + '...',
            full_text: p.fullText
          };

          verifiedLeads.set(primaryEmail, lead);
          console.log(`\n>>> [VERIFIED LEAD #${verifiedLeads.size}] <<<`);
          console.log(`Role: ${lead.role} | Exp: ${lead.experience} | Loc: ${lead.location}`);
          console.log(`Company: ${lead.company_name} | Author: ${lead.author_name} (${lead.post_date})`);
          console.log(`HR Email: ${lead.hr_email}`);

          if (verifiedLeads.size >= 13) {
            console.log('Target of 13 reached!');
            break;
          }
        }
      }

    } catch (err) {
      console.error(`Error on query ${q}:`, err.message);
    }
  }

  const finalResults = Array.from(verifiedLeads.values()).slice(0, 13);
  console.log(`\n==============================================`);
  console.log(`Total Final Verified Leads: ${finalResults.length}`);
  console.log(`==============================================`);

  fs.writeFileSync('C:/mcp/job-search-mcp-engine/linkedin_verified_13_leads.json', JSON.stringify(finalResults, null, 2));
  console.log('Successfully saved to C:/mcp/job-search-mcp-engine/linkedin_verified_13_leads.json');
  process.exit(0);
})();
