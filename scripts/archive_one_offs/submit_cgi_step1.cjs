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
      console.log('Filling CGI initial email & country form...');
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const emailInput = document.getElementById('NewEmail');
              const countrySelect = document.getElementById('Inp_CGI_Cand_Seek_Employment_Country');
              
              if (!emailInput || !countrySelect) return { error: 'Inputs not found' };
              
              emailInput.value = 'pratikpatidar7990@gmail.com';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              emailInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Select India (value IN)
              countrySelect.value = 'IN';
              countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
              
              return {
                email: emailInput.value,
                country: countrySelect.value,
                countryText: countrySelect.options[countrySelect.selectedIndex].text
              };
            })()
          `,
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Fill result:', resp.result.result.value);
        console.log('Submitting form 0...');
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              (() => {
                const forms = document.querySelectorAll('form');
                if (forms.length > 0) {
                  forms[0].submit();
                  return 'Form submitted';
                }
                return 'No form found';
              })()
            `,
            returnByValue: true
          }
        }));
      } else if (resp.id === 2) {
        console.log('Submit result:', resp.result.result.value);
        setTimeout(() => {
          ws.close();
        }, 1000);
      }
    });
  });
});
