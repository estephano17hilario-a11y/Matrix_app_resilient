import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'web-app/src');

const getFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
};

const files = getFiles(srcDir);

const results = [];

// Regex to find text inside JSX tags. It looks for > text < where text contains at least one letter and is not purely a JS expression.
const jsxTextRegex = />([^<{]*[a-zA-ZáéíóúÁÉÍÓÚñÑ][^<}]*)</g;
// Regex for placeholder="text" or label="text"
const propRegex = /(placeholder|label|title)=["']([^"']*[a-zA-ZáéíóúÁÉÍÓÚñÑ][^"']*)["']/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  
  const fileResults = new Set();

  while ((match = jsxTextRegex.exec(content)) !== null) {
    const text = match[1].trim();
    // Exclude strings that are just numbers, symbols, or single characters
    if (text.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text)) {
      // Exclude strings that are fully inside {} like {t('...')}
      if (!text.includes('t(') && !text.startsWith('{') && !text.endsWith('}')) {
        fileResults.add(text);
      }
    }
  }

  while ((match = propRegex.exec(content)) !== null) {
    const text = match[2].trim();
    if (text.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text)) {
       fileResults.add(text);
    }
  }

  if (fileResults.size > 0) {
    results.push({
      file: file.replace(srcDir, ''),
      texts: Array.from(fileResults)
    });
  }
}

fs.writeFileSync(path.join(__dirname, 'untranslated_report.json'), JSON.stringify(results, null, 2));
console.log(`Found hardcoded texts in ${results.length} files. Report saved to untranslated_report.json`);
