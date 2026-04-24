import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const esPath = path.join(__dirname, 'web-app/src/i18n/locales/es.json');
const enPath = path.join(__dirname, 'web-app/src/i18n/locales/en.json');

const esLocales = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

// Habits missing keys
if (!esLocales.habits) esLocales.habits = {};
esLocales.habits.specificDays = "Días Específicos";
esLocales.habits.flexibleCount = "Cantidad Flexible";
esLocales.habits.timesPerWeek = "Veces por semana";
esLocales.habits.specificDates = "Fechas Específicas";
esLocales.habits.lastDayOfMonth = "Último día del mes";
esLocales.habits.timesPerMonth = "Veces por mes";

if (!enLocales.habits) enLocales.habits = {};
enLocales.habits.specificDays = "Specific Days";
enLocales.habits.flexibleCount = "Flexible Count";
enLocales.habits.timesPerWeek = "Times per week";
enLocales.habits.specificDates = "Specific Dates";
enLocales.habits.lastDayOfMonth = "Last day of month";
enLocales.habits.timesPerMonth = "Times per month";

// Tasks missing keys
if (!esLocales.tasks) esLocales.tasks = {};
if (!esLocales.tasks.recurrence) esLocales.tasks.recurrence = {};
esLocales.tasks.recurrence.none = "Ninguno";
esLocales.tasks.recurrence.interval = "Intervalo";
esLocales.tasks.recurrence.weekly = "Semanal";
esLocales.tasks.recurrence.monthly = "Mensual";
esLocales.tasks.recurrence.everyDays = "Repetir cada X días";
esLocales.tasks.recurrence.INTERVAL = "INTERVALO";
esLocales.tasks.recurrence.WEEKLY = "SEMANAL";
esLocales.tasks.recurrence.MONTHLY = "MENSUAL";
esLocales.tasks.recurrence.NONE = "NINGUNO";


if (!enLocales.tasks) enLocales.tasks = {};
if (!enLocales.tasks.recurrence) enLocales.tasks.recurrence = {};
enLocales.tasks.recurrence.none = "No Repeat";
enLocales.tasks.recurrence.interval = "Interval";
enLocales.tasks.recurrence.weekly = "Weekly";
enLocales.tasks.recurrence.monthly = "Monthly";
enLocales.tasks.recurrence.everyDays = "Repeat every X days";
enLocales.tasks.recurrence.INTERVAL = "INTERVAL";
enLocales.tasks.recurrence.WEEKLY = "WEEKLY";
enLocales.tasks.recurrence.MONTHLY = "MONTHLY";
enLocales.tasks.recurrence.NONE = "NONE";

// Projects missing keys
if (!esLocales.projects) esLocales.projects = {};
esLocales.projects.specificDays = "Días Específicos";
esLocales.projects.viewByProject = "Por Proyecto";
esLocales.projects.viewByTrait = "Por Rasgo";
esLocales.projects.viewNone = "Sin División";

if (!enLocales.projects) enLocales.projects = {};
enLocales.projects.specificDays = "Specific Days";
enLocales.projects.viewByProject = "By Project";
enLocales.projects.viewByTrait = "By Trait";
enLocales.projects.viewNone = "No Division";

// Dashboard missing keys
if (!esLocales.dashboard) esLocales.dashboard = {};
esLocales.dashboard.lastDayOfMonth = "Último Día del Mes";
esLocales.dashboard.lastDayOption = "Contará como completado si se realiza el último día válido del mes.";

if (!enLocales.dashboard) enLocales.dashboard = {};
enLocales.dashboard.lastDayOfMonth = "Last Day of Month";
enLocales.dashboard.lastDayOption = "Will count as completed if done on the last valid day of the month.";

// Common missing keys
if (!esLocales.common) esLocales.common = {};
esLocales.common.daysPerMonth = "Días por Mes";
esLocales.common.next = "Siguiente";

if (!enLocales.common) enLocales.common = {};
enLocales.common.daysPerMonth = "Days per Month";
enLocales.common.next = "Next";

fs.writeFileSync(esPath, JSON.stringify(esLocales, null, 2), 'utf-8');
fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2), 'utf-8');

console.log('Translations updated successfully.');
