const WebSocket = require('ws');
const fs = require('fs');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    return {
      article: document.getElementById('Line10ClaimArticleandParagraph')?.value,
      rate: document.getElementById('Line10WithholdingRate')?.value,
      type: document.getElementById('Line10TypeOfIncomeId')?.value,
      typeText: document.getElementById('Line10TypeOfIncomeId')?.selectedOptions[0]?.text
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.id === 1) {
    console.log('Status of Line 10:', data.result.result.value);
    // Take screenshot of the form
    ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  } else if (data.id === 2) {
    const buf = Buffer.from(data.result.data, 'base64');
    fs.writeFileSync('C:/mcp/job-search-mcp-engine/screenshots/handshake_w8ben_point10_filled.png', buf);
    console.log('Screenshot saved to screenshots/handshake_w8ben_point10_filled.png');
    ws.close();
    process.exit(0);
  }
});
