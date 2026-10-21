import WebSocket from "ws";

async function checkLinkedInDMs() {
  try {
    const tabsRes = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = await tabsRes.json();
    const liTab = tabs.find((t) => t.url && t.url.includes("linkedin.com"));
    if (!liTab) {
      console.log("No LinkedIn tab open.");
      return;
    }

    const ws = new WebSocket(liTab.webSocketDebuggerUrl);
    ws.on("open", () => {
      // Evaluate messaging unread badge / pill specifically
      const code = `
        (() => {
          // Select messaging nav item
          const msgNav = document.querySelector('a[href*="/messaging"], [data-test-global-nav-link="messaging"]');
          const msgBadge = document.querySelector('.nav-item--messaging .notification-badge__count, a[href*="/messaging"] .notification-badge__count');
          const unreadCount = msgBadge ? msgBadge.innerText.trim() : "0";

          // Check if messaging overlay is open on feed
          const openConversations = Array.from(document.querySelectorAll('.msg-overlay-conversation-bubble--unread, .msg-conversation-card__unread-count')).map(el => el.innerText.trim());

          return {
            unreadCount,
            openConversationsCount: openConversations.length,
            title: document.title
          };
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: code, returnByValue: true } }));
    });

    ws.on("message", (msg) => {
      const res = JSON.parse(msg);
      if (res.id === 1) {
        console.log("DM_CHECK_RESULT:", JSON.stringify(res.result?.result?.value, null, 2));
        ws.close();
      }
    });
  } catch (e) {
    console.error("Error inspecting LinkedIn DMs:", e.message);
  }
}

checkLinkedInDMs();
