const { execSync } = require('child_process');

try {
  const psCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'node.exe'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress"`;
  const raw = execSync(psCmd, { encoding: 'utf8' });
  const data = JSON.parse(raw);
  const procs = Array.isArray(data) ? data : [data];
  
  console.log('Total node processes detected:', procs.length);
  const currentPid = process.pid;
  let killed = 0;
  
  for (const p of procs) {
    if (!p || !p.ProcessId) continue;
    const pid = p.ProcessId;
    const cmd = p.CommandLine || '';
    
    if (pid === currentPid) continue;
    if (cmd.includes('antigravity') || cmd.includes('gemini-cli') || cmd.includes('gemini\\antigravity')) {
      console.log(`Preserving Antigravity CLI process PID: ${pid}`);
      continue;
    }
    
    // Check if it's one of the worker scripts
    if (
      cmd.includes('scripts\\') ||
      cmd.includes('scripts/') ||
      cmd.includes('telegram') ||
      cmd.includes('puppeteer') ||
      cmd.includes('-e ') ||
      cmd.includes('eval')
    ) {
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`Killed orphan PID ${pid}: ${cmd.slice(0, 70)}`);
        killed++;
      } catch (e) {
        console.log(`Could not kill PID ${pid}: ${e.message}`);
      }
    }
  }
  console.log(`Cleanup complete! Killed ${killed} orphaned node processes.`);
} catch (e) {
  console.error('Error in kill_orphan_node:', e.message);
}
