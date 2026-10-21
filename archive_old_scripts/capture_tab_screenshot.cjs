const WebSocket = require('ws');
const fs = require('fs');

// Connect to parent page tab for screenshot
const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.id === 1 && data.result && data.result.data) {
    const buf = Buffer.from(data.result.data, 'base64');
    fs.writeFileSync('C:/mcp/job-search-mcp-engine/screenshots/handshake_w8ben_point10_filled.png', buf);
    console.log('Saved screenshot successfully!');
    ws.close();
    process.exit(0);
  } else {
    console.log('Response:', data);
    ws.close();
    process.exit(1);
  }
});
