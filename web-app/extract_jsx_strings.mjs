import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

const getFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
};

const files = getFiles(srcDir);
const results = {};

function extractStrings(node, sourceFile, fileStrings) {
  if (ts.isJsxText(node)) {
    const text = node.getText(sourceFile).trim();
    // Valid text: more than 1 char, contains letters, not purely symbols/spaces
    if (text.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text) && !/^[{}]+$/.test(text)) {
      fileStrings.add(text);
    }
  } else if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent)) {
    const attrName = node.parent.name.getText(sourceFile);
    if (['placeholder', 'title', 'label', 'alt'].includes(attrName)) {
      const text = node.text.trim();
      if (text.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text)) {
        fileStrings.add(text);
      }
    }
  } else if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression)) {
      // e.g. {"Some text"}
      const text = node.expression.text.trim();
      if (text.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text)) {
        fileStrings.add(text);
      }
  }

  ts.forEachChild(node, child => extractStrings(child, sourceFile, fileStrings));
}

let totalStrings = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fileStrings = new Set();
  
  extractStrings(sourceFile, sourceFile, fileStrings);
  
  if (fileStrings.size > 0) {
    const relPath = file.replace(srcDir, '');
    results[relPath] = Array.from(fileStrings);
    totalStrings += fileStrings.size;
  }
}

const reportPath = path.join(__dirname, 'untranslated_exact_report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`Successfully extracted ${totalStrings} hardcoded UI strings from ${Object.keys(results).length} files.`);
