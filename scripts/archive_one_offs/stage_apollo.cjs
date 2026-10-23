const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function stageApolloForm() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('apollohl.com'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://www.apollohl.com/jobs/reactjs-developer/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 2000));

  const profileData = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';

  console.log('--- POPULATING APOLLO FORM ON SCREEN ---');
  console.log('Name:', profileData.name);
  console.log('Email:', profileData.email);
  console.log('Phone:', profileData.phone.replace('+91 ', ''));
  console.log('City:', 'Indore');
  console.log('Org:', 'Freelance / Full Stack Developer');
  console.log('Designation:', 'React Developer');

  await page.evaluate((p) => {
    function setInput(sel, val) {
      const el = document.querySelector(sel);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setInput('input[name="your-name"]', p.name);
    setInput('input[name="mail-id"]', p.email);
    setInput('input[name="mobileno"]', p.phone.replace('+91 ', ''));
    setInput('input[name="city"]', 'Indore');
    setInput('input[name="organization"]', 'Freelance / Full Stack Developer');
    setInput('input[name="designation"]', 'React Developer');
  }, profileData);

  const fileInput = await page.$('input[name="attachyourresume"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume uploaded successfully.');
  } else {
    console.log('File input not found.');
  }

  console.log('Form fully staged and brought to front on screen.');
}

stageApolloForm().catch(console.error);
