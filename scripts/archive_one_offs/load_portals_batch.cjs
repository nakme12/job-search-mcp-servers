const puppeteer = require('puppeteer-core');
const fs = require('fs');

const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;

const targetPortals = [
  {
    company: 'Elements Energy',
    role: 'Software Developer',
    url: 'https://elementsenergy.in/careers',
    resume: 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf'
  },
  {
    company: 'Outnovate',
    role: 'Front-End Developer',
    url: 'https://outnov.com/career',
    resume: 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf'
  },
  {
    company: 'Vasudev Technolabs',
    role: 'Frontend Developer',
    url: 'https://vasudevtechnolabs.com/career/',
    resume: 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf'
  }
];

async function run() {
  console.log('Candidate real screening data loaded:', {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    current_ctc: profile.current_ctc_lpa,
    expected_ctc: profile.expected_ctc_lpa,
    notice_period: profile.notice_period_days
  });

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  for (const item of targetPortals) {
    console.log(`\nNavigating to ${item.company}: ${item.url}...`);
    const page = await browser.newPage();
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log(`Loaded ${item.company}. Page title:`, await page.title());
    } catch (e) {
      console.error(`Error loading ${item.company}:`, e.message);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
