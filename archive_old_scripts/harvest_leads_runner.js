import puppeteer from 'puppeteer-core';
import fs from 'fs';

function extractEmail(text) {
  // Regex to match valid email addresses
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
  // Filter out dummy/example emails or common false positives
  const filtered = matches.filter(e => {
    const el = e.toLowerCase();
    return !el.endsWith('.png') && !el.endsWith('.jpg') && !el.includes('example.com') && !el.includes('yourcompany.com');
  });
  return Array.from(new Set(filtered));
}

function isIndianLocation(text) {
  const t = text.toLowerCase();
  const indianCities = [
    'india', 'indore', 'bangalore', 'bengaluru', 'pune', 'noida', 'ahmedabad',
    'gurgaon', 'gurugram', 'hyderabad', 'mumbai', 'delhi', 'chennai', 'kolkata',
    'jaipur', 'chandigarh', 'kochi', 'surat', 'bhopal', 'vadodara', 'remote (india)', 'remote - india', 'pan india'
  ];
  if (t.includes('remote') && !t.includes('us only') && !t.includes('usa only') && !t.includes('c2c') && !t.includes('w2 only')) {
    return true;
  }
  return indianCities.some(c => t.includes(c));
}

function isMatchForPratik(post) {
  const t = post.fullText.toLowerCase();

  // 1. Must NOT be job seeker / open to work
  if (t.includes('open to work') || t.includes('opentowork') || t.includes('looking for new opportunities') || t.includes('seeking new opportunities') || t.includes('seeking a new role') || t.includes('i am looking for a job') || t.includes('im looking for a job') || t.includes('open to new opportunities')) {
    return { ok: false, reason: 'Candidate seeking job (OpenToWork)' };
  }

  // 2. Must be hiring
  const isHiring = t.includes('hiring') || t.includes('looking for') || t.includes('urgently required') || t.includes('urgent opening') || t.includes('we are seeking') || t.includes('opening for') || t.includes('job opening') || t.includes('immediate requirement');
  if (!isHiring) {
    return { ok: false, reason: 'Not a hiring post' };
  }

  // 3. Must be relevant role: React, Frontend, MERN
  const hasReact = t.includes('react');
  const hasFrontend = t.includes('frontend') || t.includes('front-end') || t.includes('front end');
  const hasMern = t.includes('mern');
  if (!hasReact && !hasFrontend && !hasMern) {
    return { ok: false, reason: 'Role does not match React/Frontend/MERN' };
  }

  // 4. Must NOT be senior / lead / architect / 3+ YOE
  // Filter out 3+, 4+, 5+, 6+, 7+, 8+, 9+, 10+, lead, senior, sr., principal, architect, manager
  const seniorKeywords = ['senior', 'sr.', 'lead developer', 'tech lead', 'team lead', 'principal', 'architect', 'manager', '5+ years', '6+ years', '7+ years', '8+ years', '9+ years', '10+ years', '4+ years', '3+ years', '3-5 years', '4-6 years', '5-7 years', '3 to 5 years', '4 to 6 years'];
  for (const sk of seniorKeywords) {
    // If it mentions senior or high experience specifically for the role
    if (t.includes(sk)) {
      // Check if it specifically mentions senior
      if (t.includes('senior developer') || t.includes('sr. developer') || t.includes('lead developer') || t.includes('senior frontend') || t.includes('senior react') || t.includes('sr frontend') || t.includes('sr react')) {
        return { ok: false, reason: 'Senior role' };
      }
      if (t.includes('3+') || t.includes('4+') || t.includes('5+') || t.includes('6+') || t.includes('7+') || t.includes('8+')) {
        return { ok: false, reason: 'High experience (3+ YOE)' };
      }
    }
  }

  // 5. Check experience range: 0-2 YOE
  // Matching patterns: "fresher", "0-1", "0-2", "1-2", "1+ year", "2+ year", "1 year", "2 years", "entry level", "junior", "intern", "associate"
  const expMatch = t.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?|yoe)/i) || t.match(/(\d+)\+?\s*(?:years?|yrs?|yoe)/i);
  let expText = '0-2 YOE / Junior / Fresher';
  if (expMatch) {
    if (expMatch[2]) {
      const min = parseInt(expMatch[1], 10);
      const max = parseInt(expMatch[2], 10);
      if (min >= 3) return { ok: false, reason: `Experience ${min}-${max} YOE too high` };
      expText = `${min}-${max} Years`;
    } else {
      const val = parseInt(expMatch[1], 10);
      if (val >= 3) return { ok: false, reason: `Experience ${val}+ YOE too high` };
      expText = `${val}+ Years`;
    }
  }

  // 6. Must NOT be US staffing / C2C / W2
  if (t.includes('c2c') || t.includes('w2 only') || t.includes('corp-to-corp') || t.includes('corp to corp') || t.includes('us citizen') || t.includes('green card') || t.includes('us staffing') || t.includes('est timezone') || t.includes('pst timezone')) {
    return { ok: false, reason: 'US staffing / C2C / W2 spam' };
  }

  // 7. Location must be India / Remote
  if (!isIndianLocation(t)) {
    return { ok: false, reason: 'Location not India / Remote' };
  }

  // 8. Must have real HR / Recruiter email in the post text
  const emails = extractEmail(post.fullText);
  if (emails.length === 0) {
    return { ok: false, reason: 'No email found in text' };
  }

  return { ok: true, expText, emails };
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  if (!page) { console.log('No linkedin page'); process.exit(1); }

  const queries = [
    '(React OR Frontend) (hiring OR "looking for") ("share your resume" OR "send your resume") India',
    '(MERN OR "React.js") (hiring OR "urgent") ("send resume" OR "share resume" OR "share your cv") India',
    '("React developer" OR "Frontend developer") ("0-1" OR "0-2" OR "1-2" OR "1 year" OR "fresher") ("resume" OR "cv") India',
    '(React OR Frontend OR MERN) ("send your resume to" OR "mail your resume to" OR "share profile at") India',
    '("React.js" OR MERN) ("hr@" OR "@gmail.com") hiring India',
    '("Frontend" OR React) (Indore OR Ahmedabad OR Pune OR Noida OR Bangalore) (hiring OR requirement) ("resume" OR "@")',
    '("React Developer" OR "Frontend Developer") ("junior" OR "associate" OR "1-2 years") resume India',
    'MERN ("0-2 years" OR "1-2 years" OR "1 year" OR "2 years") hiring India email',
    'React "immediate joiner" ("share cv" OR "send cv" OR "email") India',
    '("React" OR "Frontend") "share your updated resume" India'
  ];

  const harvestedMap = new Map();

  for (const q of queries) {
    console.log(`\n==============================================`);
    console.log(`SEARCH QUERY: ${q}`);
    console.log(`==============================================`);
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(q)}&sortBy=%22date_posted%22`;
    
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 4000));

      // Scroll 5 times to load posts
      for (let s = 0; s < 5; s++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await new Promise(r => setTimeout(r, 1500));
      }

      // Click all "...more" buttons
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

      // Parse all visible posts
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

          // Clean dateStr
          dateStr = dateStr.replace(/•.*$/g, '').trim();

          return {
            author,
            authorTitle,
            dateStr,
            fullText
          };
        });
      });

      console.log(`Found ${rawPosts.length} posts on page.`);

      for (const p of rawPosts) {
        if (!p.fullText || p.fullText.length < 50) continue;
        
        const matchResult = isMatchForPratik(p);
        if (matchResult.ok) {
          // Identify company name
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
            company = 'Confidential / Stealth';
          }

          // Extract role
          let role = 'Frontend / React Developer';
          const tLower = text.toLowerCase();
          if (tLower.includes('mern stack developer') || tLower.includes('mern developer')) role = 'MERN Stack Developer';
          else if (tLower.includes('react.js developer') || tLower.includes('reactjs developer') || tLower.includes('react developer')) role = 'React.js Developer';
          else if (tLower.includes('frontend developer') || tLower.includes('front end developer')) role = 'Frontend Developer';
          else if (tLower.includes('full stack developer') || tLower.includes('fullstack developer')) role = 'Full Stack Developer (MERN / React)';

          // Location extraction
          let loc = 'India / Remote';
          const locs = ['Indore', 'Bangalore', 'Bengaluru', 'Pune', 'Noida', 'Ahmedabad', 'Gurgaon', 'Gurugram', 'Hyderabad', 'Mumbai', 'Remote'];
          for (const l of locs) {
            if (tLower.includes(l.toLowerCase())) {
              loc = l;
              break;
            }
          }

          const key = matchResult.emails[0];
          if (!harvestedMap.has(key)) {
            const item = {
              id: harvestedMap.size + 1,
              role,
              experience: matchResult.expText,
              location: loc,
              author_name: p.author,
              author_title: p.authorTitle,
              company_name: company,
              hr_email: matchResult.emails[0],
              all_emails: matchResult.emails,
              post_date: p.dateStr || 'Recent',
              post_snippet: p.fullText.replace(/\n+/g, ' ').slice(0, 280) + '...',
              full_text: p.fullText
            };
            harvestedMap.set(key, item);
            console.log(`\n>>> [VERIFIED LEAD #${harvestedMap.size}] <<<`);
            console.log(`Role: ${item.role} | Exp: ${item.experience} | Loc: ${item.location}`);
            console.log(`Company: ${item.company_name} | Author: ${item.author_name} (${item.post_date})`);
            console.log(`HR Email: ${item.hr_email}`);
          }
        }
      }

      console.log(`Current Total Verified Leads: ${harvestedMap.size} / 13`);
      if (harvestedMap.size >= 15) {
        console.log('Target reached! Stopping search.');
        break;
      }

    } catch (err) {
      console.error(`Error processing query ${q}:`, err.message);
    }
  }

  const finalLeads = Array.from(harvestedMap.values()).slice(0, 13);
  console.log(`\n==============================================`);
  console.log(`Final Harvested Verified Leads: ${finalLeads.length}`);
  console.log(`==============================================`);

  fs.writeFileSync('C:/mcp/job-search-mcp-engine/linkedin_verified_13_leads.json', JSON.stringify(finalLeads, null, 2));
  console.log('Saved to C:/mcp/job-search-mcp-engine/linkedin_verified_13_leads.json successfully!');
  process.exit(0);
})();
