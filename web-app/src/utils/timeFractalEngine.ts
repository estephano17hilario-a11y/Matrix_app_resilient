import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  differenceInDays, 
  format, 
  differenceInCalendarMonths,
  differenceInCalendarYears
} from 'date-fns';
import { es } from 'date-fns/locale';

export type TimeUnit = 'DECADE' | 'LUSTRUM' | 'YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY';

interface TimeHierarchyItem {
  unit: TimeUnit;
  durationDays: number;
  label: string;
  pluralLabel: string;
}

export const TIME_HIERARCHY: TimeHierarchyItem[] = [
  { unit: 'DECADE', durationDays: 3650, label: 'Década', pluralLabel: 'Décadas' },
  { unit: 'LUSTRUM', durationDays: 1825, label: 'Lustro', pluralLabel: 'Lustros' }, // 5 años
  { unit: 'YEAR', durationDays: 365, label: 'Año', pluralLabel: 'Años' },
  { unit: 'SEMESTER', durationDays: 180, label: 'Semestre', pluralLabel: 'Semestres' },
  { unit: 'QUARTER', durationDays: 90, label: 'Trimestre', pluralLabel: 'Trimestres' },
  { unit: 'MONTH', durationDays: 30, label: 'Mes', pluralLabel: 'Meses' },
  { unit: 'WEEK', durationDays: 7, label: 'Semana', pluralLabel: 'Semanas' },
  { unit: 'DAY', durationDays: 1, label: 'Día', pluralLabel: 'Días' }
];

export interface FractalBlock {
  id: string;
  type: TimeUnit | 'REMAINDER';
  startDate: Date;
  endDate: Date;
  durationLabel: string; // "3 Meses" o "10 Días"
  children: FractalBlock[]; // Recursividad
  isPartial: boolean; // True si es un bloque remanente
  levelIndex: number; // Índice en TIME_HIERARCHY
}

// Helper to add time based on unit
const addTime = (date: Date, unit: TimeUnit, amount: number): Date => {
  switch (unit) {
    case 'DECADE': return addYears(date, amount * 10);
    case 'LUSTRUM': return addYears(date, amount * 5);
    case 'YEAR': return addYears(date, amount);
    case 'SEMESTER': return addMonths(date, amount * 6);
    case 'QUARTER': return addMonths(date, amount * 3);
    case 'MONTH': return addMonths(date, amount);
    case 'WEEK': return addWeeks(date, amount);
    case 'DAY': return addDays(date, amount);
    default: return addDays(date, amount);
  }
};

// Helper to get duration in days for initial check
const getDurationInDays = (unit: TimeUnit): number => {
  const item = TIME_HIERARCHY.find(h => h.unit === unit);
  return item ? item.durationDays : 1;
};

// Get localized label
const getLabel = (unit: TimeUnit, count: number): string => {
  const item = TIME_HIERARCHY.find(h => h.unit === unit);
  if (!item) return '';
  return `${count} ${count === 1 ? item.label : item.pluralLabel}`;
};

export const generateFractalTree = (startDate: Date, endDate: Date): FractalBlock[] => {
  const totalDays = differenceInDays(endDate, startDate) + 1; // Inclusive
  if (totalDays <= 0) return [];

  return decomposeTimeRange(startDate, endDate, 0);
};

const decomposeTimeRange = (
  start: Date, 
  end: Date, 
  minHierarchyIndex: number, 
  isRemainder: boolean = false
): FractalBlock[] => {
  const totalDays = differenceInDays(end, start) + 1; // Inclusive (e.g., today to today is 1 day)
  
  if (totalDays <= 0) return [];

  // Find the largest unit that fits at least once, starting from minHierarchyIndex
  let selectedUnitIndex = -1;
  
  for (let i = minHierarchyIndex; i < TIME_HIERARCHY.length; i++) {
    const unitDuration = TIME_HIERARCHY[i].durationDays;
    // Special handling for calendar units to be more precise could go here, 
    // but durationDays is a good enough heuristic for selection.
    // For strict calendar fitting, we might verify with addTime.
    
    // Check if at least one unit fits
    const projectedEnd = addTime(start, TIME_HIERARCHY[i].unit, 1);
    const daysInUnit = differenceInDays(projectedEnd, start);
    
    // We use the smaller of the heuristic or actual to be safe, or just check if totalDays >= unitDuration
    if (totalDays >= unitDuration) {
      selectedUnitIndex = i;
      break;
    }
  }

  // If no unit fits (e.g. less than a day? shouldn't happen if DAY is 1), default to DAY
  if (selectedUnitIndex === -1) {
    selectedUnitIndex = TIME_HIERARCHY.length - 1; // DAY
  }

  const selectedHierarchy = TIME_HIERARCHY[selectedUnitIndex];
  const blocks: FractalBlock[] = [];
  let currentCursor = start;

  // 1. Create full blocks
  while (true) {
    const nextCursor = addTime(currentCursor, selectedHierarchy.unit, 1);
    // If next block exceeds end date, stop
    if (differenceInDays(end, nextCursor) + 1 < 0) { // Check if we went past the end
       // Wait, if nextCursor is exactly end date + 1 day, it means we finished exactly.
       // differenceInDays(end, nextCursor) would be -1 if nextCursor is end + 1.
       // Actually, simpler: if nextCursor > addDays(end, 1) roughly.
       // Let's use compare:
       break;
    }
    
    // Check strict bounds
    if (nextCursor.getTime() > end.getTime() + 86400000) { // approximate buffer or just strict comparison
        // If the calculated end of the unit is strictly after the target end date
        // But wait, if it's EQUAL to end date (plus time?), it fits.
        // We are working with dates, usually set to 00:00:00.
        // Let's assume inclusive end date.
        // If nextCursor (start of next block) is > end, we stop.
        // But nextCursor is the START of the NEXT block.
        // The current block goes from currentCursor to nextCursor - 1ms (or 1 day).
        // So if nextCursor - 1 day > end, we stop.
    }
    
    // Let's stick to: if adding the unit keeps us <= end date (roughly)
    // Actually, simpler logic:
    // Try to add the unit. If the result <= end (inclusive), accept it.
    // Be careful with exact dates. 
    // If I have 4 months 10 days. 
    // Start: Jan 1. End: May 11 (approx).
    // Quarter: Jan 1 -> Apr 1. (Fits)
    // Next Quarter: Apr 1 -> Jul 1. (Exceeds May 11). Stop.
    
    // Use differenceInDays to check if we have enough days left for a full unit?
    // Not perfect because months vary.
    // Best is to project the date.
    if (nextCursor.getTime() > addDays(end, 1).getTime()) {
        break;
    }

    const blockEndDate = addDays(nextCursor, -1);
    
    const block: FractalBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedHierarchy.unit,
      startDate: currentCursor,
      endDate: blockEndDate,
      durationLabel: `1 ${selectedHierarchy.label}`,
      isPartial: false,
      levelIndex: selectedUnitIndex,
      children: []
    };
    
    // Generate children for this full block
    // Drill down: Divide into standard children (next smaller unit)
    if (selectedUnitIndex < TIME_HIERARCHY.length - 1) {
        // e.g. Quarter -> Months
        // We just call decompose for the range of this block, starting from next unit
        block.children = decomposeTimeRange(
            block.startDate, 
            block.endDate, 
            selectedUnitIndex + 1, 
            false
        );
    }

    blocks.push(block);
    currentCursor = nextCursor;
  }

  // 2. Handle Remainder
  const daysRemaining = differenceInDays(end, currentCursor) + 1;
  
  if (daysRemaining > 0) {
    // There is a remainder.
    // Treat as a block but mark as partial/remainder.
    // The "type" of the remainder block isn't straightforward because it's a mix.
    // But as per instructions: "Si sobra tiempo (1 mes, 10 días), este bloque se etiqueta como REMAINDER."
    // And "El algoritmo se llama a sí mismo para este remanente, pero forzando a buscar la siguiente unidad menor".
    
    // We create a wrapper block for the remainder? 
    // Or do we just append the decomposition of the remainder to the main list?
    // The prompt says: "Cabe 1 Trimestre. (Queda 1 Mes + 10 Días de remanente). El Remanente: Se trata como un bloque secundario."
    // "Dentro del remanente, cabe 1 Mes. (Quedan 10 días)."
    
    // This implies the remainder is ITSELF a block in the parent list, or just sibling blocks?
    // "Se dividirá en: 1 Trimestre + 1 Mes + 10 Días" suggests they are siblings at the top level?
    // But the prompt also says: "El Remanente: Se trata como un bloque secundario."
    // And "El algoritmo se llama a sí mismo (recursión) para este remanente, pero forzando a buscar la siguiente unidad menor".
    
    // Let's interpret "Se dividirá en: 1 Trimestre + 1 Mes + 10 Días" as a flattened list of top-level blocks.
    // So we don't necessarily wrap them in a "REMAINDER" block unless we need a container.
    // However, the interface has `isPartial`.
    
    // Let's recursively call decompose for the remainder part, forcing next unit.
    const remainderBlocks = decomposeTimeRange(
        currentCursor, 
        end, 
        selectedUnitIndex + 1, 
        true
    );
    
    // Mark these as partial/remainder context if needed, or just append them.
    // The prompt says: "Visualización... Los bloques remanentes... se ven con textura rayada"
    // So they need to be identifiable.
    
    // If we just append them, they are just smaller blocks. 
    // e.g. Quarter (Standard) + Month (Standard but smaller) + Week (Standard but smaller).
    // But are they "partial"?
    // Maybe "partial" means it's not the "Main Unit" of this level.
    // The Main Unit was "Quarter". The "Month" is a remainder of the Quarter-based division.
    
    remainderBlocks.forEach(b => {
        b.isPartial = true; // It is part of the remainder of this level
        blocks.push(b);
    });
  }

  return blocks;
};

// Helper to get text description of the structure
export const getStructureDescription = (blocks: FractalBlock[]): string => {
    if (blocks.length === 0) return '';
    
    const counts: Record<string, number> = {};
    
    blocks.forEach(b => {
        const key = b.type;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const parts: string[] = [];
    TIME_HIERARCHY.forEach(h => {
        if (counts[h.unit]) {
            parts.push(getLabel(h.unit, counts[h.unit]));
        }
    });
    
    return parts.join(' + ');
};

// Helper to get total duration label
export const getTotalDurationLabel = (start: Date, end: Date): string => {
    const diffDays = differenceInDays(end, start) + 1;
    
    // Simple heuristic for display
    if (diffDays >= 365) {
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = (diffDays % 365) % 30;
        let text = `${years} ${years === 1 ? 'Año' : 'Años'}`;
        if (months > 0) text += `, ${months} ${months === 1 ? 'Mes' : 'Meses'}`;
        if (days > 0) text += `, ${days} ${days === 1 ? 'Día' : 'Días'}`;
        return text;
    }
    
    if (diffDays >= 30) {
        const months = Math.floor(diffDays / 30);
        const days = diffDays % 30;
        let text = `${months} ${months === 1 ? 'Mes' : 'Meses'}`;
        if (days > 0) text += `, ${days} ${days === 1 ? 'Día' : 'Días'}`;
        return text;
    }
    
    if (diffDays >= 7) {
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        let text = `${weeks} ${weeks === 1 ? 'Semana' : 'Semanas'}`;
        if (days > 0) text += `, ${days} ${days === 1 ? 'Día' : 'Días'}`;
        return text;
    }
    
    return `${diffDays} ${diffDays === 1 ? 'Día' : 'Días'}`;
};
