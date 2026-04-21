import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportPath = path.join(__dirname, 'untranslated_exact_report.json');
const esPath = path.join(__dirname, 'src/i18n/locales/es.json');
const enPath = path.join(__dirname, 'src/i18n/locales/en.json');
const srcDir = path.join(__dirname, 'src');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const esLocales = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

if (!esLocales.auto) esLocales.auto = {};
if (!enLocales.auto) enLocales.auto = {};

let totalReplaced = 0;

for (const [relFile, texts] of Object.entries(report)) {
  const filePath = path.join(srcDir, relFile);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Add import if not present
  const needsImport = !content.includes('useTranslation');
  let importAdded = false;

  for (const text of texts) {
    // Generate a safe key
    const key = text.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30).replace(/^_+|_+$/g, '');
    if (!key) continue;

    // Add to locales
    esLocales.auto[key] = text; // Keep original as Spanish (most seem Spanish, some English, we just put the text)
    enLocales.auto[key] = text; // User can translate later or we can call an API. We just wrap it for now.

    // Replace in JSX Text: > text < -> >{t('auto.key')}<
    // We need to be careful with regex
    const jsxRegex = new RegExp(`>\\s*${text.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}\\s*<`, 'g');
    if (jsxRegex.test(content)) {
      content = content.replace(jsxRegex, `>{t('auto.${key}')}<`);
      changed = true;
    }

    // Replace in props: prop="text" -> prop={t('auto.key')}
    const propRegex = new RegExp(`(placeholder|title|label|alt)=["']${text.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}["']`, 'g');
    if (propRegex.test(content)) {
      content = content.replace(propRegex, `$1={t('auto.${key}')}`);
      changed = true;
    }
  }

  if (changed) {
    // Inject useTranslation hook if needed
    if (needsImport && !importAdded) {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
      content = content.slice(0, endOfLastImport) + `import { useTranslation } from 'react-i18next';\n` + content.slice(endOfLastImport);
      importAdded = true;
    }
    
    // Inject const { t } = useTranslation(); inside the component
    // This is very hard to do safely with regex for all kinds of components (arrow, function, memo, etc.)
    // So we'll skip the hook injection and just use the global i18n object if possible, OR we let the user know they need to add `const { t } = useTranslation();`
    // Actually, `t` might not be defined. A safer way is to import `t` from i18n directly.
    // import { t } from 'i18next';
    if (!content.includes(`import { t } from 'i18next';`) && !content.includes('useTranslation')) {
       content = `import { t } from 'i18next';\n` + content;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    totalReplaced++;
  }
}

fs.writeFileSync(esPath, JSON.stringify(esLocales, null, 2), 'utf-8');
fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2), 'utf-8');

console.log(`Replaced strings in ${totalReplaced} files and updated locales.`);
