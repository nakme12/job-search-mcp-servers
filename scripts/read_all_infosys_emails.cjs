const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
  const p = await b.newPage();
  
  console.log('Searching all emails matching Infosys...');
  await p.goto('https://mail.google.com/mail/u/0/#search/Infosys', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const emailList = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
    return rows.map((r, i) => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const email = r.querySelector('.zF, .bA4, .yX, span[email]')?.getAttribute('email') || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      return { idx: i, sender, email, subject, snippet, date };
    });
  });

  console.log(`Found ${emailList.length} rows.`);
  const infosysSpecific = emailList.filter(e => 
    e.sender.toLowerCase().includes('infosys') || 
    e.email.toLowerCase().includes('infosys') || 
    e.subject.toLowerCase().includes('infosys')
  );

  console.log('=== INFOSYS SPECIFIC EMAILS ===');
  console.log(JSON.stringify(infosysSpecific, null, 2));

  // Let's click and read the body of each Infosys specific email
  for (const item of infosysSpecific) {
    console.log(`\n--- Reading body for: [${item.date}] ${item.subject} ---`);
    await p.evaluate((idx) => {
      const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
      const target = rows[idx]?.querySelector('.bog') || rows[idx];
      if (target) target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }, item.idx);

    await new Promise(r => setTimeout(r, 3500));

    const details = await p.evaluate(() => {
      const subject = document.querySelector('h2.hP')?.innerText || '';
      const senderEl = document.querySelector('.gD');
      const senderName = senderEl?.innerText || '';
      const senderEmail = senderEl?.getAttribute('email') || '';
      const dateEl = document.querySelector('.g3');
      const date = dateEl?.getAttribute('title') || dateEl?.innerText || '';
      const bodyEl = document.querySelector('.a3s');
      const body = bodyEl ? bodyEl.innerText : '';
      const links = Array.from(document.querySelectorAll('.a3s a')).map(a => ({ text: a.innerText, href: a.href }));
      return { subject, senderName, senderEmail, date, body, links };
    });

    console.log(JSON.stringify(details, null, 2));
    
    // Go back to search
    await p.goto('https://mail.google.com/mail/u/0/#search/Infosys', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
  }

  await p.close();
  b.disconnect();
})();
