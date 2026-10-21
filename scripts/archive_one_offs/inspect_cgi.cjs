const WebSocket = require('ws');
const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const cgiTab = tabs.find(t => t.title.includes('CGI'));
    if (!cgiTab) {
      console.log('No CGI tab found');
      return;
    }
    const ws = new WebSocket(cgiTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            Array.from(document.querySelectorAll('input, select, button, a.btn')).map(el => {
              return el.tagName + '#' + el.id + '[name=' + el.name + '][type=' + (el.type || '') + '][value=' + (el.value || '') + '] text: ' + (el.innerText || '');
            }).join('\\n')
          `
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('CGI Elements:\n' + resp.result.result.value);
        ws.close();
      }
    });
  });
});
