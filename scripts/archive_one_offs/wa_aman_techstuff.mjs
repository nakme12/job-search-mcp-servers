import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('WhatsApp tab not found');
    await browser.disconnect();
    return;
  }

  console.log('Finding Aman Techstuff chat in WhatsApp...');
  const chatOpened = await wa.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span[title]'));
    const target = spans.find(s => s.getAttribute('title') === 'Aman Techstuff');
    if (!target) return false;
    const clickable = target.closest('div[tabindex]') || target.parentElement;
    if (clickable) {
      clickable.click();
      return true;
    }
    target.click();
    return true;
  });

  if (!chatOpened) {
    console.error('Could not find Aman Techstuff in chat list');
    await browser.disconnect();
    return;
  }

  await sleep(2500);

  const headerTitle = await wa.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.innerText.split('\n')[0] : '';
  });
  console.log('Opened chat:', headerTitle);

  // Read last 5 messages to see context
  const recentMessages = await wa.evaluate(() => {
    const msgs = Array.from(document.querySelectorAll('div.message-in, div.message-out, div[data-id]'));
    return msgs.slice(-5).map(m => m.innerText.replace(/\n+/g, ' '));
  });
  console.log('Recent messages:', recentMessages);

  await browser.disconnect();
}

main().catch(console.error);
