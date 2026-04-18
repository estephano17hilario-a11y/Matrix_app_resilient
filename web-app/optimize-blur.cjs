const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace heavy backdrop-blur with lighter versions + transform-gpu
  content = content.replace(/backdrop-blur-(sm|md|lg|xl|2xl|3xl)/g, 'backdrop-blur-[2px] transform-gpu');
  
  // Same for standard blur if it's too high, though backdrop-blur is the main culprit
  // Let's also reduce standard blur on absolute elements that might cause issues
  content = content.replace(/blur-(md|lg|xl|2xl|3xl)/g, 'blur-sm transform-gpu');

  // Avoid duplicates if we run it multiple times
  content = content.replace(/transform-gpu transform-gpu/g, 'transform-gpu');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(directory);
console.log('Done optimizing blur for mobile GPU.');
