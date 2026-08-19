// cli_job_viewer.js
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const os = require('os');

// Path to the final wide list JSON (absolute path from earlier view)
const DATA_PATH = path.resolve('C:/Users/Dell/AppData/Local/Temp/claude/D--adi-mcp/2359fcc1-b037-4495-a467-e62d6bbd3ddb/scratchpad/final_wide_list.json');

function loadJobs() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const jobs = JSON.parse(raw);
    return jobs;
  } catch (e) {
    console.error('Failed to load jobs from', DATA_PATH);
    console.error(e.message);
    process.exit(1);
  }
}

function uniq(arr) {
  return [...new Set(arr)];
}

function filterByLocation(jobs, loc) {
  if (loc === 'All') return jobs;
  return jobs.filter(j => (j.location || '').toLowerCase().includes(loc.toLowerCase()));
}

function searchJobs(jobs, term) {
  const lower = term.toLowerCase();
  return jobs.filter(j =>
    (j.title && j.title.toLowerCase().includes(lower)) ||
    (j.company && j.company.toLowerCase().includes(lower)) ||
    (j.location && j.location.toLowerCase().includes(lower))
  );
}

function paginate(arr, pageSize, page) {
  const start = (page - 1) * pageSize;
  return arr.slice(start, start + pageSize);
}

async function mainMenu(jobs) {
  let filteredJobs = jobs;
  let currentPage = 1;
  const pageSize = 20;

  while (true) {
    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
    const pageJobs = paginate(filteredJobs, pageSize, currentPage);
    console.clear();
    console.log(`Showing page ${currentPage}/${totalPages} (${filteredJobs.length} jobs total)`);
    console.table(pageJobs.map((j, idx) => ({
      '#': (currentPage - 1) * pageSize + idx + 1,
      Title: j.title,
      Company: j.company,
      Location: j.location,
      Remote: j.remote,
      Date: j.date,
      Source: j.src,
      URL: j.url
    })));

    const choices = [
      { name: 'Next page', value: 'next' },
      { name: 'Previous page', value: 'prev' },
      { name: 'Filter by location', value: 'filter' },
      { name: 'Search', value: 'search' },
      { name: 'Reset filters', value: 'reset' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose an action',
        choices
      }
    ]);

    if (action === 'next') {
      if (currentPage < totalPages) currentPage++;
    } else if (action === 'prev') {
      if (currentPage > 1) currentPage--;
    } else if (action === 'filter') {
      const locations = uniq(jobs.map(j => j.location || 'Unknown')).sort();
      const { loc } = await inquirer.prompt([
        {
          type: 'list',
          name: 'loc',
          message: 'Select location to filter',
          choices: ['All', ...locations]
        }
      ]);
      filteredJobs = filterByLocation(jobs, loc);
      currentPage = 1;
    } else if (action === 'search') {
      const { term } = await inquirer.prompt([
        { type: 'input', name: 'term', message: 'Enter search term' }
      ]);
      filteredJobs = searchJobs(jobs, term);
      currentPage = 1;
    } else if (action === 'reset') {
      filteredJobs = jobs;
      currentPage = 1;
    } else if (action === 'exit') {
      console.log('Goodbye!');
      break;
    }
  }
}

function run() {
  const jobs = loadJobs();
  console.log(`Loaded ${jobs.length} job entries.`);
  mainMenu(jobs);
}

run();
