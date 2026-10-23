const { applyAshbyUniversal } = require('./ashby_universal_runner.cjs');

async function runCollinear() {
  const target = {
    company: "Collinear AI",
    role: "MTS - Engineering (India)",
    url: "https://jobs.ashbyhq.com/collinear-ai/80442b09-b40b-47f5-a6ec-64a6ab042ff5/application"
  };
  await applyAshbyUniversal(target);
}

runCollinear().catch(console.error);
