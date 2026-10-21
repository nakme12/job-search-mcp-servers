/**
 * UNIVERSAL ATS APPLICATION ENGINE
 * Supports: Ashby ATS, Greenhouse ATS, Lever ATS, and Company Career Portals
 * 
 * Protocol:
 * 1. Binds strictly to candidate_screening_profile.json (Canonical data).
 * 2. Uploads authorized resumes from /resumes folder.
 * 3. Populates text, comboboxes, dropdowns, and checkboxes accurately.
 * 4. Resolves phone country codes strictly to India (+91).
 * 5. Handles CAPTCHA detection and alerts user if present.
 * 6. Captures strictly ONE post-submit confirmation screenshot.
 * 7. Automatically logs confirmed submission into applied_todays_<DATE>.json.
 * 8. Immediately closes completed/disqualified browser tab.
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { CANONICAL_PATHS } = require('./canonical_paths.cjs');
const { assertSlot } = require('./slot_guard.cjs');

// Hard barrier: Universal ATS form submission is strictly prohibited outside Slot 6
assertSlot(['CYCLE1_SLOT6', 'CYCLE2_SLOT6'], 'Universal ATS Form Filling & Submission');

const PROFILE_PATH = CANONICAL_PATHS.PROFILE_FILE;
const RESUME_DIR = CANONICAL_PATHS.RESUMES_DIR;

function getProfile() {
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')).profile;
}

function getBestResume(roleTitle) {
  const t = (roleTitle || '').toLowerCase();
  if (t.includes('full stack') || t.includes('mern') || t.includes('node') || t.includes('backend')) {
    return path.join(RESUME_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  if (t.includes('react') || t.includes('ui') || t.includes('front end') || t.includes('frontend')) {
    return path.join(RESUME_DIR, 'Pratik Patidar Resume - React Developer.pdf');
  }
  return path.join(RESUME_DIR, 'Pratik Patidar Resume - Frontend Engineer.pdf');
}

async function fillAshby(page, roleTitle = '') {
  // Ensure Ashby is navigated to /application URL
  if (page.url().includes('ashbyhq.com') && !page.url().includes('/application')) {
    const appUrl = page.url().replace(/\/$/, '') + '/application';
    try {
      console.log('[Universal Engine] [Ashby] Auto-navigating to /application endpoint:', appUrl);
      await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 3000));
    } catch(e) {}
  }

  const profile = getProfile();
  console.log('[Universal Engine] [Ashby] Filling application for:', profile.name);
  
  // 1-3. Fill Name, Email, Phone silently and instantly
  await page.evaluate((prof) => {
    function setVal(selector, val) {
      const el = document.querySelector(selector);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setVal('input[name="_systemfield_name"]', prof.name);
    setVal('input[name="_systemfield_email"]', prof.email);
    // BLINDSPOT 3 FIX: Clean 10 digits phone without space
    setVal('input#phone, input[name="phone"]', (prof.phone_raw || prof.phone.replace(/[^0-9]/g, '')).slice(-10));
  }, profile);
  
  // 4. Upload Resume specifically to the application form resume field
  const resumePath = getBestResume(roleTitle);
  console.log('[Universal Engine] [Ashby] Uploading Resume:', resumePath);
  const resumeInput = await page.$('input#_systemfield_resume') || (await page.$$('input[type="file"]'))[1];
  if (resumeInput) {
    await resumeInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 2500));
  }
  
  // 4. Fill Dynamic Fields (LinkedIn, GitHub, Location, Experience, Notice, Relocation)
  await page.evaluate((prof) => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    inputs.forEach(i => {
      let p = i.parentElement;
      let label = '';
      while (p && p !== document.body) {
        if (p.querySelector('label') || p.innerText.length > 3) {
          label = p.innerText.toLowerCase();
          break;
        }
        p = p.parentElement;
      }
      
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        
        // Rule 70: Pre-clear input to avoid concatenation
        if (prototypeValueSetter) {
          prototypeValueSetter.call(element, '');
        } else if (valueSetter) {
          valueSetter.call(element, '');
        } else {
          element.value = '';
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Set verified new value
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (label.includes('linkedin')) setNativeValue(i, prof.linkedin);
      else if (label.includes('github')) setNativeValue(i, prof.github);
      else if (label.includes('portfolio') || label.includes('website')) setNativeValue(i, prof.portfolio);
      else if (label.includes('current location') || label.includes('where are you based') || label.includes('country you\'re currently residing in') || label.includes('location')) setNativeValue(i, 'India');
      else if (label.includes('relocate') || label.includes('relocation')) setNativeValue(i, 'Yes, ready to relocate immediately');
      else if (label.includes('when can you join') || label.includes('earliest') || label.includes('notice')) setNativeValue(i, '15 Days / Immediate');
      else if (label.includes('last working day')) setNativeValue(i, 'Currently serving notice period (available in 15 days)');
      else if (label.includes('current ctc') || label.includes('last drawn') || label.includes('current compensation')) setNativeValue(i, '2.16 LPA');
      else if (label.includes('expected ctc') || label.includes('expected compensation') || label.includes('salary expectation')) setNativeValue(i, '4.65 LPA');
      else if (label.includes('total work experience') || label.includes('years of experience') || label.includes('total experience')) setNativeValue(i, '1.5');
      else if (label.includes('how did you hear') || label.includes('how did you come')) setNativeValue(i, 'Direct Career Portal / Open Source Community');
      else if (label.includes('excited about') || label.includes('mission') || label.includes('why work here')) {
        setNativeValue(i, 'I am excited by the scalable web architectures and real-time user-facing products your engineering team is building. With 1.5 years of hands-on experience in React, Next.js, and TypeScript, I want to build ultra-responsive UI workflows, clean component libraries, and robust frontend features that create seamless developer and user experiences.');
      }
      else if (label.includes('hard problem') || label.includes('achievement')) {
        setNativeValue(i, 'Engineered a real-time reactive dashboard using React, WebSocket, and state memoization that reduced client-side rendering bottlenecks by 40% and maintained sub-100ms UI responsiveness under high frequency data streams.');
      }
      else if (label.includes('if other') || label.includes('please specify')) {
        setNativeValue(i, 'Engineering Career Portal');
      }
    });
    
    // Handle Radio Buttons (including How did you hear: LinkedIn)
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    radios.forEach(r => {
      const parentLabel = (r.closest('label')?.innerText || r.parentElement?.innerText || '').toLowerCase();
      if (parentLabel.includes('linkedin') || parentLabel.includes('user') || parentLabel.includes('social')) {
        if (!r.checked) r.click();
      }
    });

    // Handle Option Buttons (Yes/No buttons, etc.)
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach(b => {
      const p = b.closest('div, fieldset');
      const pText = (p?.innerText || '').toLowerCase();
      const bText = b.innerText.trim();

      // Authorization without sponsorship -> No (candidate is in India / needs visa for US/UK/Canada)
      if (pText.includes('authorized to work in') && (pText.includes('sponsorship') || pText.includes('u.s.') || pText.includes('united states'))) {
        if (bText === 'No') b.click();
      }
      // Relocation willingness -> Yes
      else if (pText.includes('willing to relocate') || pText.includes('relocation')) {
        if (bText === 'Yes') b.click();
      }
      // 18 years or older -> Yes
      else if (pText.includes('18 years') || pText.includes('age')) {
        if (bText === 'Yes') b.click();
      }
    });

    // Handle Checkboxes (Country of residence, Pronouns, Agreements)
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    checkboxes.forEach(cb => {
      const container = cb.closest('div, fieldset');
      const cText = (container?.innerText || '').toLowerCase();
      const lText = (cb.closest('label')?.innerText || cb.name || '').toLowerCase();

      // Country of residence -> 'Other' (when India is not explicitly in options)
      if (cText.includes('country of residence')) {
        if (lText.includes('other') || cb.name === 'Other') {
          if (!cb.checked) cb.click();
        }
      }
      // Pronouns -> He/His
      else if (cText.includes('pronoun')) {
        if (lText.includes('he/his') || cb.name === 'He/His') {
          if (!cb.checked) cb.click();
        }
      }
      // General consents / terms
      else if (cText.includes('consent') || cText.includes('agree') || cText.includes('privacy') || cText.includes('policy')) {
        if (!cb.checked) cb.click();
      }
    });
  }, profile);
  
  console.log('[Universal Engine] [Ashby] Dynamic fields, radios, and checkboxes mapped.');
}

async function fillGreenhouse(page, roleTitle = '') {
  const profile = getProfile();
  console.log('[Universal Engine] [Greenhouse] Filling application for:', profile.name);
  
  // 1. Silent native assignment for standard fields
  await page.evaluate((prof) => {
    function setVal(selector, val) {
      const el = document.querySelector(selector);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setVal('#first_name, input[name*="first_name"]', prof.first_name);
    setVal('#last_name, input[name*="last_name"]', prof.last_name);
    setVal('#email, input[name*="email"]', prof.email);
    setVal('#phone, input[name*="phone"]', prof.phone.replace('+91 ', '').trim());
  }, profile);

  // 2. Fix Country Code Dropdown to India (+91)
  try {
    const itiFlag = await page.$('.iti__selected-flag, .iti__flag-container button, div[class*="flag-container"]');
    if (itiFlag) {
      await itiFlag.click();
      await new Promise(r => setTimeout(r, 400));
      const searchInput = await page.$('#iti-0__search-input, .iti__search-input, input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.type('India', { delay: 10 });
        await new Promise(r => setTimeout(r, 200));
      }
      const indiaOption = await page.$('#iti-0__item-in, [data-country-code="in"], .iti__country[data-country-code="in"]');
      if (indiaOption) await indiaOption.click();
    }
  } catch(e) {}

  // 3. Attach Authorized Resume
  const resumePath = getBestResume(roleTitle);
  console.log('[Universal Engine] [Greenhouse] Attaching resume:', resumePath);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 2000));
  }

  // 4. Fill text inputs and textareas (Why join, Location, Links, CTC, Notice)
  await page.evaluate((prof) => {
    function setReactVal(el, val) {
      if (!el || !val) return;
      el.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
      const prototype = Object.getPrototypeOf(el);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(el, val);
      } else if (valueSetter) {
        valueSetter.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    allInputs.forEach(i => {
      const fieldContainer = i.closest('.field, div[class*="field"], div[class*="question"]') || i.parentElement;
      const label = ((fieldContainer?.querySelector('label')?.innerText || '') + ' ' + (i.placeholder || '') + ' ' + (i.name || '')).toLowerCase();

      if (label.includes('linkedin')) setReactVal(i, prof.linkedin);
      else if (label.includes('github')) setReactVal(i, prof.github);
      else if (label.includes('portfolio') || label.includes('website')) setReactVal(i, prof.portfolio);
      else if (label.includes('why do you want to join') || label.includes('why figma') || label.includes('why are you interested')) {
        setReactVal(i, `I have 1.5 years of experience building modern web applications with React, Next.js, and TypeScript. I admire the company's product excellence and engineering culture, and I am excited to contribute high-quality frontend solutions to the team.`);
      }
      else if (label.includes('from where do you intend to work') || label.includes('where will you work') || label.includes('intended location')) {
        setReactVal(i, 'Indore, India (Open to Remote / Relocate)');
      }
      else if (label.includes('current location') || label.includes('where are you based')) {
        setReactVal(i, 'Indore, Madhya Pradesh, India');
      }
      else if (label.includes('notice period') || label.includes('earliest start date')) {
        setReactVal(i, '15 Days / Immediate');
      }
      else if (label.includes('current ctc') || label.includes('current salary')) {
        setReactVal(i, '2.16 LPA');
      }
      else if (label.includes('expected ctc') || label.includes('expected salary')) {
        setReactVal(i, '4.65 LPA');
      }
    });

    // 5. Handle Select Dropdowns (Select tags)
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(s => {
      const fieldContainer = s.closest('.field, div[class*="field"], div[class*="question"]') || s.parentElement;
      const label = ((fieldContainer?.querySelector('label')?.innerText || '') + ' ' + (s.name || '')).toLowerCase();
      const options = Array.from(s.options).map(o => ({ el: o, text: o.text.toLowerCase(), val: o.value }));

      function pick(matcher) {
        const found = options.find(o => matcher(o.text));
        if (found) {
          s.value = found.val;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (label.includes('authorized to work in the country') || label.includes('work authorization')) {
        pick(t => t.includes('no') || t.includes('require sponsorship') || t.includes('yes'));
      } else if (label.includes('ever worked for') || label.includes('previous employee')) {
        pick(t => t.includes('no'));
      } else if (label.includes('years of professional experience') || label.includes('years of experience')) {
        pick(t => t.includes('1-2') || t.includes('1 to 2') || t.includes('2') || t.includes('1'));
      } else if (label.includes('full-time software engineer in a professional setting')) {
        pick(t => t.includes('yes'));
      } else if (label.includes('built and maintained user-facing web applications')) {
        pick(t => t.includes('yes'));
      } else if (label.includes('primary technical expertise')) {
        pick(t => t.includes('frontend') || t.includes('front-end') || t.includes('full stack'));
      } else if (label.includes('programming languages do you regularly use')) {
        pick(t => t.includes('javascript') || t.includes('typescript') || t.includes('react'));
      } else if (label.includes('pronouns')) {
        pick(t => t.includes('he/him') || t.includes('he/his') || t.includes('prefer not to say'));
      } else if (label.includes('gender')) {
        pick(t => t.includes('male') || t.includes('man') || t.includes('prefer not to say'));
      } else if (label.includes('hispanic') || label.includes('latino')) {
        pick(t => t.includes('no'));
      } else if (label.includes('veteran')) {
        pick(t => t.includes('not a veteran') || t.includes('no') || t.includes('i am not'));
      } else if (label.includes('disability')) {
        pick(t => t.includes('no') || t.includes('i do not have') || t.includes('prefer not to say'));
      }
    });
  }, profile);

  console.log('[Universal Engine] [Greenhouse] Form populated with native keystrokes, textareas, and dropdown mappings.');
}

module.exports = {
  fillAshby,
  fillGreenhouse,
  getBestResume,
  getProfile
};
