const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');

// Find the line with 'loadSection('dashboard');'
const loadSectionLine = lines.findIndex(line => line.includes("loadSection('dashboard');"));
console.log('loadSection line:', loadSectionLine);

// Find the script tag before that
let scriptStart = -1;
for (let i = loadSectionLine - 1; i >= 0; i--) {
  if (lines[i].includes('<script>')) {
    scriptStart = i;
    break;
  }
}
console.log('script start:', scriptStart);

// Count div opens and closes from main-content to script
let divCount = 0;
let mainContentLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div class="main-content">')) {
    mainContentLine = i;
    break;
  }
}

console.log('main-content at line:', mainContentLine);

for (let i = mainContentLine; i < scriptStart; i++) {
  const line = lines[i];
  if (line.includes('<div')) divCount++;
  if (line.includes('</div>')) divCount--;
}
console.log('div balance:', divCount);