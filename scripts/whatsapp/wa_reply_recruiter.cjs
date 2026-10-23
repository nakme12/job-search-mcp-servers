/**
 * WhatsApp Auto-Reply & Resume Dispatcher Script (CommonJS)
 * Usage:
 *   node scripts/whatsapp/wa_reply_recruiter.cjs [phone_number_optional] [--attach-resume] [--custom-text="..."]
 */

const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');
const fs = require('fs');

const args = process.argv.slice(2);
const phoneRaw = args.find(a => !a.startsWith('--'));
const phone = phoneRaw ? phoneRaw.replace(/[^0-9]/g, '') : null;
const shouldAttachResume = args.includes('--attach-resume');
const customTextArg = args.find(a => a.startsWith('--custom-text='));
const customText = customTextArg ? customTextArg.replace('--custom-text=', '').replace(/^["']|["']$/g, '') : null;

// Canonical Profile
const profilePath = 'C:/mcp/job-search-mcp-engine/candidate_screening_profile.json';
const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8')).profile;
const defaultResumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function activateTab(tabId) {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json/activate/' + tabId, () => resolve());
  });
}

function buildMessageLines() {
  if (customText) {
    return customText.split('\n');
  }
  return [
    "Hi,",
    "",
    "Thanks for reaching out! Sharing my details below:",
    "",
    "Full Name: " + profileData.name,
    "Location: " + profileData.city + " (Open to Relocate)",
    "Experience: Experienced (1.5 Years - React.js, Next.js, TypeScript, REST APIs)",
    "Qualification: " + profileData.education.degree + " (" + profileData.education.year_of_passing + ")",
    "Current CTC: " + profileData.current_ctc_lpa + " LPA",
    "Expected CTC: " + profileData.expected_ctc_lpa + " LPA",
    "Notice Period: " + profileData.notice_period_days + " Days",
    "Preferred Profile: React.js / Frontend Developer",
    "Work Mode: Open to Onsite / Hybrid / Remote",
    "",
    "Please let me know about the next round.",
    "",
    "Thanks,",
    "Pratik",
    "8269647990"
  ];
}

async function main() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
  if (!waTab) {
    console.error('❌ WhatsApp Web tab not found in browser');
    process.exit(1);
  }

  await activateTab(waTab.id);
  const ws = new WebSocket(waTab.webSocketDebuggerUrl);

  ws.on('open', async () => {
    if (phone) {
      console.log('📱 Navigating to WhatsApp: +' + phone + '...');
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.navigate',
        params: { url: 'https://web.whatsapp.com/send?phone=' + phone }
      }));
      await new Promise(r => setTimeout(r, 4500));
    }

    // 1. Clear chatbox
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const el = document.querySelector('footer div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"][data-tab="10"]');
          if (!el) return false;
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          return true;
        })()`
      }
    }));

    // 2. Type cleanly with Shift+Enter
    const lines = buildMessageLines();
    console.log('✍️ Typing formatted multiline reply (' + lines.length + ' lines)...');

    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 0) {
        ws.send(JSON.stringify({
          id: 100 + i,
          method: 'Input.insertText',
          params: { text: line }
        }));
      }
      if (i < lines.length - 1) {
        ws.send(JSON.stringify({
          id: 200 + i,
          method: 'Input.dispatchKeyEvent',
          params: {
            type: 'rawKeyDown',
            windowsVirtualKeyCode: 13,
            key: 'Enter',
            code: 'Enter',
            modifiers: 8
          }
        }));
        ws.send(JSON.stringify({
          id: 300 + i,
          method: 'Input.dispatchKeyEvent',
          params: {
            type: 'keyUp',
            windowsVirtualKeyCode: 13,
            key: 'Enter',
            code: 'Enter',
            modifiers: 8
          }
        }));
      }
    }

    console.log('✅ Message drafted cleanly in WhatsApp input box');

    // 3. Attach resume if flag enabled
    if (shouldAttachResume) {
      console.log('📎 Attaching resume PDF...');
      await new Promise(r => setTimeout(r, 500));
      ws.send(JSON.stringify({
        id: 500,
        method: 'DOM.getDocument',
        params: { depth: -1 }
      }));
    } else {
      await activateTab(waTab.id);
      ws.close();
      process.exit(0);
    }
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    if (msg.id === 500) {
      ws.send(JSON.stringify({
        id: 501,
        method: 'DOM.querySelectorAll',
        params: {
          nodeId: msg.result.root.nodeId,
          selector: 'input[type="file"]'
        }
      }));
    } else if (msg.id === 501) {
      const nodeIds = msg.result.nodeIds;
      if (nodeIds && nodeIds.length > 0) {
        ws.send(JSON.stringify({
          id: 502,
          method: 'DOM.setFileInputFiles',
          params: {
            files: [defaultResumePath],
            nodeId: nodeIds[0]
          }
        }));
      } else {
        console.log('File input not directly accessible');
        ws.close();
        process.exit(0);
      }
    } else if (msg.id === 502) {
      console.log('✅ Resume PDF attached in WhatsApp preview!');
      await activateTab(waTab.id);
      ws.close();
      process.exit(0);
    }
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
