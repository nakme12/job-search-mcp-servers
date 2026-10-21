const fs = require('fs');

const content = fs.readFileSync('C:/Users/LENOVO/.gemini/antigravity-cli/brain/0f45d8e6-a406-4e19-a4c4-bbb0197e9967/.system_generated/steps/1452/output.txt', 'utf8');
const lines = content.split('\n');
const taskIds = [];
for (const line of lines) {
  const m = line.match(/"taskId":\s*"([^"]+)"/);
  if (m && !m[1].includes('task-26')) {
    taskIds.push(m[1]);
  }
}

console.log('Total tasks to kill:', taskIds.length);
fs.writeFileSync('scripts/tasks_to_kill.json', JSON.stringify(taskIds, null, 2));
