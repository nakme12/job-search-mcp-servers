import WebSocket from "ws";

async function inspectInbox() {
  try {
    const tabsRes = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = await tabsRes.json();
    const liTab = tabs.find((t) => t.url && t.url.includes("linkedin.com"));
    if (!liTab) {
      console.log("LinkedIn tab not found.");
      return;
    }

    const ws = new WebSocket(liTab.webSocketDebuggerUrl);
    ws.on("open", () => {
      const code = `
        (() => {
          const title = document.title;
          const badges = Array.from(document.querySelectorAll('.notification-badge__count, .nav-item__badge-count')).map(el => el.innerText.trim());
          const activeUser = document.querySelector('.global-nav__me-photo')?.getAttribute('alt') || 'Logged in user';
          return { title, badges, activeUser };
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: code, returnByValue: true } }));
    });

    ws.on("message", (msg) => {
      const res = JSON.parse(msg);
      if (res.id === 1) {
        console.log("INBOX_STATUS:", JSON.stringify(res.result?.result?.value, null, 2));
        ws.close();
      }
    });
  } catch (e) {
    console.error("Error inspecting inbox:", e.message);
  }
}

inspectInbox();
