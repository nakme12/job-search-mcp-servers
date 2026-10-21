import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('WA tab not found');
    await browser.disconnect();
    return;
  }

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('Sending Document 1 (FE)...');
  // First, find all file inputs
  // Let's set the input files via Page.setFileInputFiles directly via CDP session!
  const client = await wa.target().createCDPSession();

  // Find the file input node
  const doc = await client.send('DOM.getDocument', { depth: -1 });
  
  // Query input[type="file"]
  const res = await client.send('DOM.querySelectorAll', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  console.log('Found file input nodeIds:', res.nodeIds);

  // We want to upload to the input with accept="*" or the first one
  // Let's get attributes for each
  let targetNodeId = null;
  for (const nid of res.nodeIds) {
    const attrs = await client.send('DOM.getAttributes', { nodeId: nid });
    console.log('Node', nid, 'attributes:', attrs.attributes);
    const attrMap = {};
    for (let i = 0; i < attrs.attributes.length; i += 2) {
      attrMap[attrs.attributes[i]] = attrs.attributes[i+1];
    }
    if (attrMap['accept'] === '*' || !attrMap['accept']?.includes('image')) {
      targetNodeId = nid;
      break;
    }
  }

  if (!targetNodeId && res.nodeIds.length > 0) {
    targetNodeId = res.nodeIds[0];
  }

  console.log('Selected targetNodeId:', targetNodeId);

  // Set file for FE resume
  await client.send('DOM.setFileInputFiles', {
    files: [feResume],
    nodeId: targetNodeId
  });
  console.log('Set file input files for FE resume! Waiting 4s...');
  await sleep(4000);

  // Save screenshot of preview
  await wa.screenshot({ path: 'screenshots/2026-10-12/cdp_fe_preview.png' });

  // Click Send
  const sent1 = await wa.evaluate(() => {
    const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
             || document.querySelector('[aria-label="Send"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Sent FE resume:', sent1);
  await sleep(5000);

  // Now set file for MERN resume
  console.log('Sending Document 2 (MERN)...');
  await client.send('DOM.setFileInputFiles', {
    files: [mernResume],
    nodeId: targetNodeId
  });
  console.log('Set file input files for MERN resume! Waiting 4s...');
  await sleep(4000);

  await wa.screenshot({ path: 'screenshots/2026-10-12/cdp_mern_preview.png' });

  const sent2 = await wa.evaluate(() => {
    const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
             || document.querySelector('[aria-label="Send"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Sent MERN resume:', sent2);
  await sleep(5000);

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_cdp_final.png' });
  console.log('Final screenshot saved to screenshots/2026-10-12/wa_aman_both_resumes_cdp_final.png');

  await browser.disconnect();
}

main().catch(console.error);
