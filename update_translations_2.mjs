import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const esPath = path.join(__dirname, 'web-app/src/i18n/locales/es.json');
const enPath = path.join(__dirname, 'web-app/src/i18n/locales/en.json');

const esLocales = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

if (!esLocales.common) esLocales.common = {};
esLocales.common.thisWeek = "Esta semana";
esLocales.common.thisMonth = "Este mes";

if (!enLocales.common) enLocales.common = {};
enLocales.common.thisWeek = "This week";
enLocales.common.thisMonth = "This month";

fs.writeFileSync(esPath, JSON.stringify(esLocales, null, 2), 'utf-8');
fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2), 'utf-8');

console.log('common keys updated');
