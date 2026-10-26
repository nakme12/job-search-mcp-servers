const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const list = JSON.parse(data);
    const target = list.find(t => t.url && t.url.includes('exams.red-sag.com'));
    if (!target) return;
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.on('open', () => {
      const code = `(async () => {
        try {
          const dbs = await indexedDB.databases();
          let idbData = {};
          for (let dbInfo of dbs) {
            idbData[dbInfo.name] = await new Promise((resolve) => {
              const req = indexedDB.open(dbInfo.name);
              req.onsuccess = (e) => {
                const db = e.target.result;
                const storeNames = Array.from(db.objectStoreNames);
                const storeData = {};
                if (storeNames.length === 0) { resolve(storeData); return; }
                let completed = 0;
                for (let sn of storeNames) {
                  try {
                    const tx = db.transaction(sn, 'readonly');
                    const store = tx.objectStore(sn);
                    const getAll = store.getAll();
                    getAll.onsuccess = () => {
                      storeData[sn] = getAll.result;
                      completed++;
                      if (completed === storeNames.length) resolve(storeData);
                    };
                    getAll.onerror = () => {
                      completed++;
                      if (completed === storeNames.length) resolve(storeData);
                    };
                  } catch(err) {
                    completed++;
                    if (completed === storeNames.length) resolve(storeData);
                  }
                }
              };
              req.onerror = () => resolve('error opening');
            });
          }
          return { idbData };
        } catch(e) {
          return { error: e.message };
        }
      })()`;

      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: code,
          awaitPromise: true,
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('IDB RESULT:', JSON.stringify(resp.result.result.value, null, 2).substring(0, 2000));
        ws.close();
      }
    });
  });
});
