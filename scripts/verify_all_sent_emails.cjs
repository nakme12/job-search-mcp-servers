const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    // Find or create a Gmail tab
    let gmail = pages.find(p => p.url().includes('mail.google.com'));
    if (!gmail) {
      gmail = await browser.newPage();
    }
    
    console.log('Navigating to Gmail Sent folder...');
    await gmail.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    // Read the sent threads in Sent view
    const sentThreads = await gmail.evaluate(() => {
      // Rows in Gmail table
      const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
      return rows.map((row, idx) => {
        const text = row.innerText.replace(/\n+/g, ' | ').trim();
        const recipientSpan = row.querySelector('span[email], span.yP, span.zF, .yW span');
        const subjectEl = row.querySelector('.bog, .bqe, span[data-thread-id]');
        const snippetEl = row.querySelector('.y2');
        const dateEl = row.querySelector('.xW, span[title]');
        const hasAttachment = !!row.querySelector('.brc, .a13, [aria-label*="Attachment"], [title*="Attachment"], img[alt*="attachment"]');
        
        return {
          rowNum: idx + 1,
          fullText: text,
          recipient: recipientSpan ? (recipientSpan.getAttribute('email') || recipientSpan.innerText) : '',
          subject: subjectEl ? subjectEl.innerText : '',
          snippet: snippetEl ? snippetEl.innerText : '',
          date: dateEl ? (dateEl.getAttribute('title') || dateEl.innerText) : '',
          hasAttachment
        };
      });
    });
    
    console.log(`Found ${sentThreads.length} rows in Sent view.`);
    
    // Let's filter to those sent today (19 Oct / Oct 19 / 13:xx / 14:xx / 15:xx)
    const todayThreads = sentThreads.filter(t => {
      const txt = t.fullText.toLowerCase();
      return txt.includes('19 oct') || txt.includes('oct 19') || /\b1[345]:\d\d\b/.test(txt) || txt.includes('pratik');
    });
    
    console.log(`Matching today's sent threads: ${todayThreads.length}`);
    fs.writeFileSync('scripts/sent_verification_report.json', JSON.stringify(sentThreads, null, 2));
    
    // Print out each thread clearly
    sentThreads.slice(0, 45).forEach((t, i) => {
      console.log(`[${i + 1}] ${t.fullText}`);
    });
  } catch (err) {
    console.error('Error verifying sent emails:', err.message);
  }
})();
