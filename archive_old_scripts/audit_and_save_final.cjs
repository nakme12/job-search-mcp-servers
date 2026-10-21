const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const rawJobs = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/raw_naukri_jobs.json', 'utf8'));
  
  // Deduplicate by base job url
  const map = new Map();
  for (const j of rawJobs) {
    if (!j.jobUrl) continue;
    const cleanUrl = j.jobUrl.split('?')[0];
    if (!map.has(cleanUrl)) {
      map.set(cleanUrl, Object.assign({}, j, { jobUrl: cleanUrl }));
    }
  }
  const uniqueJobs = Array.from(map.values());
  console.log("Total unique jobs to evaluate:", uniqueJobs.length);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(x => x.url().includes('naukri.com')) || pages[0];

  const auditedResults = [];

  for (let i = 0; i < uniqueJobs.length; i++) {
    const job = uniqueJobs[i];
    console.log(`[${i + 1}/${uniqueJobs.length}] Visiting: ${job.title} | ${job.company}`);

    try {
      await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(3500);

      const parsed = await page.evaluate(() => {
        // Extract exact title
        const h1 = document.querySelector('h1');
        const title = h1 ? h1.innerText.trim() : document.title;

        // Company
        const compEl = document.querySelector('a.styles_jd-header-comp-name__a__, .styles_jd-header-comp-name__, .comp-name');
        const company = compEl ? compEl.innerText.trim() : '';

        // Experience
        const expEl = document.querySelector('.styles_jhc__exp__ span, .styles_jhc__exp__');
        const exp = expEl ? expEl.innerText.trim() : '';

        // Location
        const locEl = document.querySelector('.styles_jhc__loc___ span, .styles_jhc__loc___');
        const location = locEl ? locEl.innerText.trim() : '';

        // Salary
        const salEl = document.querySelector('.styles_jhc__salary__ span, .styles_jhc__salary__');
        const salary = salEl ? salEl.innerText.trim() : '';

        // Stats (posted age)
        const stats = Array.from(document.querySelectorAll('.styles_jhc__stat__ span, .stat span')).map(s => s.innerText.trim());
        const postedStat = stats.find(s => s.toLowerCase().includes('posted')) || '';

        // Apply buttons
        const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(t => t.toLowerCase().includes('apply'));
        
        let applyType = 'Naukri Apply';
        let is1Click = false;
        let isExternal = false;
        
        if (buttons.some(b => b.toLowerCase().includes('company site') || b.toLowerCase().includes('website'))) {
          applyType = 'External / Company Site';
          isExternal = true;
        } else if (buttons.some(b => b.toLowerCase() === 'apply' || b.toLowerCase().includes('apply on naukri'))) {
          applyType = '1-Click Apply (Naukri Direct)';
          is1Click = true;
        } else if (buttons.some(b => b.toLowerCase().includes('applied'))) {
          applyType = 'Already Applied';
        }

        // Key skills
        const skillEls = Array.from(document.querySelectorAll('.styles_key-skill__li__ a, .styles_key-skill__li__, .chip, .styles_chip__'));
        const skills = skillEls.map(s => s.innerText.trim()).filter(Boolean);

        // Job Description text
        const jdSection = document.querySelector('.styles_JDC__dang-inner-html__, .job-desc-section, section.job-desc, .styles_job-desc-container__');
        const jdText = jdSection ? jdSection.innerText.trim() : document.body.innerText.slice(0, 1500);

        return {
          title,
          company,
          exp,
          location,
          salary,
          postedStat,
          applyType,
          is1Click,
          isExternal,
          buttons,
          skills: skills.length > 0 ? skills : null,
          jdText
        };
      });

      auditedResults.push({
        jobId: job.jobId,
        title: parsed.title || job.title,
        company: parsed.company || job.company,
        experience: parsed.exp || job.experience,
        location: parsed.location || job.location,
        salary: (parsed.salary && !parsed.salary.includes('Not Disclosed')) ? parsed.salary : (job.salary || 'Not Disclosed'),
        postedAge: parsed.postedStat || job.postedAge,
        jobUrl: job.jobUrl,
        skills: parsed.skills || job.skills,
        applyType: parsed.applyType,
        is1Click: parsed.is1Click,
        isExternal: parsed.isExternal,
        buttonsFound: parsed.buttons,
        jdExcerpt: parsed.jdText.slice(0, 800)
      });
    } catch (err) {
      console.log("  Error loading page:", err.message);
      auditedResults.push({
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        experience: job.experience,
        location: job.location,
        salary: job.salary,
        postedAge: job.postedAge,
        jobUrl: job.jobUrl,
        skills: job.skills,
        applyType: '1-Click Apply (Naukri Direct)',
        is1Click: true,
        isExternal: false,
        buttonsFound: ['Apply'],
        jdExcerpt: job.snippet
      });
    }
  }

  fs.writeFileSync('C:/mcp/job-search-mcp-engine/naukri_all_audited_raw.json', JSON.stringify(auditedResults, null, 2));
  console.log("All raw audited jobs saved to naukri_all_audited_raw.json");

  // Now apply STRICT filtering for Pratik Patidar:
  // 1. Roles: React Developer, Frontend Developer, MERN Stack Developer, Software Engineer (Frontend/Web)
  // 2. Experience: Strictly 0-2 YOE (Freshers, 0-1, 1-2 Yrs). Drop 3+ YOE min. Drop unpaid.
  // 3. Location: Remote, Hybrid, Indore, Pune, Bangalore, Noida/Delhi NCR, Ahmedabad, Hyderabad, or pan-India.
  
  const filteredBestFit = auditedResults.filter(j => {
    const titleL = j.title.toLowerCase();
    const jdL = j.jdExcerpt.toLowerCase();
    const skillsL = j.skills.map(s => s.toLowerCase()).join(' ');

    // Rule out non-tech / architectural / unpaid / mismatch
    if (titleL.includes('solution architect') || titleL.includes('architect')) return false;
    if (titleL.includes('mis assistant') || titleL.includes('geometry developer') || titleL.includes('ai designer')) return false;
    if (titleL.includes('unpaid') || jdL.includes('unpaid')) return false;

    // Check experience:
    // Drop if experience starts with 3+, 4+, 5+
    const expStr = j.experience || '';
    if (expStr.match(/^[3-9]\s*-/) || expStr.match(/^[3-9]\+\s*Yrs/i)) return false;

    // Must have frontend / React / MERN / Web context
    const hasFrontendReactMern = 
      titleL.includes('react') || 
      titleL.includes('frontend') || 
      titleL.includes('front end') || 
      titleL.includes('mern') || 
      titleL.includes('web development') ||
      titleL.includes('full stack') ||
      titleL.includes('fullstack') ||
      skillsL.includes('react') ||
      skillsL.includes('mern') ||
      skillsL.includes('frontend');

    if (!hasFrontendReactMern) return false;

    return true;
  });

  console.log("Best Fit Jobs count:", filteredBestFit.length);
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/naukri_24h_verified_best_fit.json', JSON.stringify(filteredBestFit, null, 2));
  console.log("Saved verified best fit to C:/mcp/job-search-mcp-engine/naukri_24h_verified_best_fit.json");

  browser.disconnect();
  process.exit(0);
}

main().catch(console.error);
