const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const examTab = list.find(t => t.type === 'page' && t.url.startsWith('https://exams.red-sag.com'));
    if (!examTab) {
      console.log('Exam Tab not found');
      return;
    }
    const ws = new WebSocket(examTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const els = Array.from(document.querySelectorAll('*'));
            const needed = els.find(e => e.children.length === 0 && e.innerText && e.innerText.includes('Needed:'));
            const photoInput = document.querySelector('input[type="file"]');
            return {
              neededHTML: needed ? needed.parentElement.outerHTML : 'Not found',
              photoInputHTML: photoInput ? photoInput.parentElement.outerHTML : 'Not found'
            };
          })()`,
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('DETAILS:\n', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
