const WebSocket = require('ws');
const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const cgiTab = tabs.find(t => t.title.includes('CGI'));
    const ws = new WebSocket(cgiTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            Array.from(document.querySelectorAll('form')).map((f, i) => {
              return 'Form ' + i + ': action=' + f.action + ' method=' + f.method + '\\n' +
                Array.from(f.elements).map(e => '  ' + e.tagName + '#' + e.id + '[name=' + e.name + '][type=' + (e.type || '') + ']').join('\\n');
            }).join('\\n-----------------\\n');
          `
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('CGI Forms:\n' + resp.result.result.value);
        ws.close();
      }
    });
  });
});
