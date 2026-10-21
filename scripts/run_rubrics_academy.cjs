const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('rubricsacademy')) || pages[1];

  console.log('Automating Rubrics Academy on:', page.url());

  let finished = false;
  let maxSteps = 60;
  let count = 0;

  while (!finished && count < maxSteps) {
    count++;
    await new Promise(r => setTimeout(r, 1500));

    const info = await page.evaluate(() => {
      const chip = document.getElementById('lesson-chip')?.innerText || '';
      const text = document.body.innerText || '';
      const primaryBtn = document.getElementById('nav-primary');
      const isPrimaryDisabled = primaryBtn ? primaryBtn.disabled || primaryBtn.classList.contains('disabled') : true;

      // Check if interactive questions/choices exist
      const choices = Array.from(document.querySelectorAll('.choice, .option, button[data-choice], [role="radio"], [role="checkbox"], .quiz-option, .selectable, button.pill')).map(c => ({
        text: c.innerText.trim(),
        selected: c.classList.contains('selected') || c.getAttribute('aria-checked') === 'true'
      }));

      // Check if any generic buttons exist on the card
      const otherButtons = Array.from(document.querySelectorAll('button')).map(b => ({
        id: b.id,
        text: b.innerText.trim(),
        className: b.className
      })).filter(b => b.text && !b.id.includes('home') && !b.id.includes('prev') && !b.id.includes('files'));

      return { chip, text: text.slice(0, 600), isPrimaryDisabled, choices, otherButtons };
    });

    console.log(`\n[STEP ${count}] CHIP: ${info.chip}`);

    if (info.text.toLowerCase().includes('congratulations') || info.text.toLowerCase().includes('course completed') || info.text.toLowerCase().includes('return to projects')) {
      console.log('Course completed or congratulation screen reached!');
      finished = true;
      break;
    }

    // If there are clickable interactive options/choices that need to be selected
    if (info.choices && info.choices.length > 0) {
      console.log('Found choices:', info.choices.map(c => c.text));
      // Try clicking first unselected choice or all correct choices
      await page.evaluate(() => {
        const choiceElements = document.querySelectorAll('.choice, .option, button[data-choice], [role="radio"], [role="checkbox"], .quiz-option, .selectable, button.pill');
        if (choiceElements.length > 0) {
          choiceElements[0].click();
        }
      });
      await new Promise(r => setTimeout(r, 800));
    }

    // If primary button is ready to click
    const clickedPrimary = await page.evaluate(() => {
      const primaryBtn = document.getElementById('nav-primary');
      if (primaryBtn && !primaryBtn.disabled) {
        primaryBtn.click();
        return true;
      }
      return false;
    });

    if (clickedPrimary) {
      console.log('Clicked primary nav button');
    } else {
      // Look for custom submit or continue buttons
      const clickedOther = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button')).filter(b => {
          const t = b.innerText.trim().toLowerCase();
          return t.includes('continue') || t.includes('submit') || t.includes('next') || t.includes('check') || t.includes('start');
        });
        if (btns.length > 0) {
          btns[0].click();
          return btns[0].innerText.trim();
        }
        return null;
      });
      if (clickedOther) {
        console.log('Clicked other action button:', clickedOther);
      } else {
        console.log('No obvious continue button active. Checking card elements...');
        // Let's inspect interactive inputs or drag drops if any
        const details = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('*')).filter(el => el.onclick || el.getAttribute('role') === 'button').map(el => el.innerText.trim()).filter(Boolean).slice(0, 5);
        });
        console.log('Candidate elements:', details);
      }
    }
  }

  console.log('Runner completed cycle. Final Chip:');
  const finalChip = await page.evaluate(() => document.getElementById('lesson-chip')?.innerText);
  console.log(finalChip);

  browser.disconnect();
})().catch(e => console.error(e));
