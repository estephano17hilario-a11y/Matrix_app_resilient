const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace height animations
    content = content.replace(/,\s*height:\s*(?:'auto'|"auto"|0)/g, '');
    content = content.replace(/height:\s*(?:'auto'|"auto"|0)\s*,/g, '');
    content = content.replace(/height:\s*(?:'auto'|"auto"|0)/g, '');
    
    // Replace width animations inside progress bars and such
    content = content.replace(/,\s*width:\s*(?:'auto'|"auto"|0)/g, '');
    content = content.replace(/width:\s*(?:'auto'|"auto"|0)\s*,/g, '');
    content = content.replace(/width:\s*(?:'auto'|"auto"|0)/g, '');

    // Note: Replacing width with scaleX requires changing style as well, but for simplicity we remove the frame-by-frame width/height.
    // If it's a progress bar, we should use inline styles for static width, not animate width.
    // E.g. `animate={{ width: \`\${progress}%\` }}` -> `style={{ width: \`\${progress}%\` }}`

    if (content !== original) {
      // Cleanup empty initial/animate
      content = content.replace(/initial={{\s*}}/g, '');
      content = content.replace(/animate={{\s*}}/g, '');
      content = content.replace(/exit={{\s*}}/g, '');
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
      console.log('Removed width/height animation in:', filePath);
    }
  }
});

console.log('Modified', modifiedFiles, 'files to remove layout animations');
