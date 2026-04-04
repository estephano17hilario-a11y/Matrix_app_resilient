const fs = require('fs');
const path = require('path');

const getAllFiles = (dir, extn, files, result, regex) => {
  files = files || fs.readdirSync(dir);
  result = result || [];
  regex = regex || new RegExp(`\\${extn}$`);

  for (let i = 0; i < files.length; i++) {
    let file = path.join(dir, files[i]);
    if (fs.statSync(file).isDirectory()) {
      try {
        result = getAllFiles(file, extn, fs.readdirSync(file), result, regex);
      } catch (error) {
        continue;
      }
    } else {
      if (regex.test(file)) {
        result.push(file);
      }
    }
  }
  return result;
};

const srcDir = path.join(__dirname, 'src');
const allTsFiles = getAllFiles(srcDir, '.tsx').concat(getAllFiles(srcDir, '.ts'));

console.log('Total files:', allTsFiles.length);

const allContent = allTsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const unusedFiles = [];
for (const file of allTsFiles) {
  const basename = path.basename(file, path.extname(file));
  if (basename === 'App' || basename === 'main' || basename === 'Dashboard' || basename === 'index' || basename === 'vite-env.d') continue;
  
  // A naive check: does the basename appear anywhere else in the content?
  // We can count occurrences. If it's <= 1 (only in its own file), it's probably unused.
  const regex = new RegExp(basename, 'g');
  const matches = allContent.match(regex);
  if (!matches || matches.length <= 1) {
    // Check if it's imported by name
    unusedFiles.push(file);
  }
}
console.log('Potentially unused files:', unusedFiles);