const fs = require('fs');

const file = 'C:/Users/LENOVO/.gemini/antigravity-cli/brain/0f45d8e6-a406-4e19-a4c4-bbb0197e9967/.system_generated/steps/1474/output.txt';
const text = fs.readFileSync(file, 'utf8');

const regex = /"taskId":\s*"([^"]+)"/g;
const tasks = [];
let match;
while ((match = regex.exec(text)) !== null) {
  if (!match[1].endsWith('task-26')) {
    tasks.push(match[1]);
  }
}

console.log('Found tasks to kill:', tasks.length);
fs.writeFileSync('scripts/tasks_to_kill.json', JSON.stringify(tasks, null, 2));
