// embed_jobs_fixed.js
const fs = require('fs');
const path = require('path');

// Paths (adjust if moved)
const jsonPath = path.resolve('C:/Users/Dell/AppData/Local/Temp/claude/D--adi-mcp/2359fcc1-b037-4495-a467-e62d6bbd3ddb/scratchpad/final_wide_list.json');
const outHtml = path.resolve('D:/adi/mcp/jobs_embedded_fixed.html');

// Load JSON data (as a string)
const jobsJson = fs.readFileSync(jsonPath, 'utf-8').trim(); // retains array brackets

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>All Front‑end Jobs (Embedded)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    body {font-family:'Inter',sans-serif;margin:0;background:#f9fafb;color:#111827;}
    header{background:#1f2937;color:#fff;padding:1.5rem;text-align:center;}
    .container{max-width:1200px;margin:2rem auto;padding:0 1rem;}
    .controls{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;}
    .controls input,.controls select{padding:.5rem .75rem;border:1px solid #d1d5db;border-radius:4px;flex:1 1 200px;font-size:.95rem;}
    table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1);}
    th,td{padding:.75rem 1rem;border-bottom:1px solid #e5e7eb;text-align:left;}
    th{background:#f3f4f6;font-weight:600;}
    tr:hover{background:#f0f9ff;}
    a{color:#2563eb;text-decoration:none;}
    a:hover{text-decoration:underline;}
    @media(max-width:768px){th,td{font-size:.85rem;}.controls{flex-direction:column;}}
  </style>
</head>
<body>
  <header>
    <h1>All Front‑end Jobs (Embedded)</h1>
    <p>Junior (0‑2 YOE) front‑end roles – India & Remote</p>
  </header>
  <div class="container">
    <div class="controls">
      <input type="text" id="searchBox" placeholder="Search title, company, location..."/>
      <select id="locationFilter"><option value="All">All Locations</option></select>
    </div>
    <table id="jobsTable">
      <thead>
        <tr><th>#</th><th>Title</th><th>Company</th><th>Location</th><th>Remote</th><th>Date</th><th>Source</th><th>Link</th></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
  <script>
    // Embedded job data
    const jobs = ${jobsJson};

    // Populate location filter
    const locationSelect = document.getElementById('locationFilter');
    const uniqLocations = [...new Set(jobs.map(j=>j.location||'Unknown'))].sort();
    uniqLocations.forEach(loc=>{const opt=document.createElement('option');opt.value=loc;opt.textContent=loc;locationSelect.appendChild(opt);});

    const tbody = document.querySelector('#jobsTable tbody');
    function render(list){
      tbody.innerHTML='';
      list.forEach((j,i)=>{
        const tr=document.createElement('tr');
        tr.innerHTML = '<td>'+(i+1)+'</td>'+
                     '<td>'+ (j.title||'') +'</td>'+
                     '<td>'+ (j.company||'') +'</td>'+
                     '<td>'+ (j.location||'') +'</td>'+
                     '<td>'+ (j.remote===true?'Yes':j.remote===false?'No':'') +'</td>'+
                     '<td>'+ (j.date||'') +'</td>'+
                     '<td>'+ (j.src||'') +'</td>'+
                     '<td><a href="'+j.url+'" target="_blank" rel="noopener">View</a></td>';
        tbody.appendChild(tr);
      });
    }

    function applyFilters(all){
      const term = document.getElementById('searchBox').value.toLowerCase();
      const loc  = document.getElementById('locationFilter').value;
      return all.filter(j=>{
        const matchSearch = (j.title && j.title.toLowerCase().includes(term)) ||
                            (j.company && j.company.toLowerCase().includes(term)) ||
                            (j.location && j.location.toLowerCase().includes(term));
        const matchLoc = loc==='All' || (j.location && j.location.includes(loc));
        return matchSearch && matchLoc;
      });
    }

    // Initial render & event listeners
    render(jobs);
    document.getElementById('searchBox').addEventListener('input',()=>render(applyFilters(jobs)));
    document.getElementById('locationFilter').addEventListener('change',()=>render(applyFilters(jobs)));
  </script>
</body>
</html>`;

fs.writeFileSync(outHtml, html, 'utf-8');
console.log('✅ Embedded HTML generated at', outHtml);
