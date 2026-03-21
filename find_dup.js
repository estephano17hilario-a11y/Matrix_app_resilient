const fs = require('fs');

function checkDups(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const path = [];
  let indentLevel = 0;
  
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('}')) {
      path.pop();
    }
    const match = line.match(/^\s*"([^"]+)"\s*:/);
    if (match) {
      const key = match[1];
      console.log(`Line ${i+1}: ${key}`);
    }
  });
}

checkDups('web-app/src/i18n/locales/en.json');