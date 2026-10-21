const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('elevenlabs'));
  if (!page) { console.log('Page not found'); return; }

  const textareas = await page.$$('textarea');
  console.log('Textareas count:', textareas.length);
  if (textareas.length >= 3) {
    await textareas[0].type('LinkedIn Job Board & Community');
    await sleep(500);
    await textareas[1].type('ElevenLabs is redefining voice and conversational AI globally. With 1.5 years of experience building modern reactive interfaces in React.js, Next.js, and TypeScript, I want to engineer ultra-responsive, highly accessible frontend tools that empower creators and musicians.');
    await sleep(500);
    await textareas[2].type('Architected and developed a full-stack real-time analytics and audio interface using React.js, TypeScript, and WebSockets. Solved complex performance bottlenecks caused by continuous live stream re-renders by decoupling high-frequency state updates with virtualized rendering, lowering render latency to under 50ms.');
    console.log('Successfully typed into all 3 textareas!');
  }

  // Location input
  const locInput = await page.$('input#_systemfield_location, input[name="_systemfield_location"]');
  if (locInput) {
    await locInput.type('India');
    await sleep(1000);
    // Maybe an autocomplete dropdown appears
    await page.keyboard.press('ArrowDown');
    await sleep(300);
    await page.keyboard.press('Enter');
  }

  console.log('Bringing tab to front...');
  await page.bringToFront();
}

main().catch(console.error);
