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
      console.log('Clicking Create Profile button on CGI form...');
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const emailInput = document.getElementById('NewEmail');
              const countrySelect = document.getElementById('Inp_CGI_Cand_Seek_Employment_Country');
              emailInput.value = 'pratikpatidar7990@gmail.com';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              emailInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              countrySelect.value = 'IN';
              countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
              
              const submitBtn = Array.from(document.querySelectorAll('input[type="submit"]')).find(b => b.value === 'Create Profile');
              if (submitBtn) {
                submitBtn.click();
                return 'Clicked Create Profile button';
              }
              return 'Submit button not found';
            })()
          `,
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Result:', resp.result.result.value);
        setTimeout(() => ws.close(), 2000);
      }
    });
  });
});
