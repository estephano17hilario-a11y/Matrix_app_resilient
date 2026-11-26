import type { SuperHabitId } from '../catalog';
import type { WorldDef } from './types';
import { AGUA } from './agua';
import { EMPRENDIMIENTO } from './emprendimiento';
import { ESTUDIAR } from './estudiar';
import { GYM } from './gym';
import { IDIOMAS } from './idiomas';
import { COMUNICACION } from './comunicacion';
import { ALIMENTACION } from './alimentacion';
import { LECTURA } from './lectura';
import { TRABAJO } from './trabajo';
import { IQ } from './iq';
import { PROGRAMACION } from './programacion';
import { MEDITACION } from './meditacion';
import { YOGA } from './yoga';
import { SKINCARE } from './skincare';
import { CATOLICA } from './catolica';

/** One bespoke world per super habit. */
export const WORLDS: Record<SuperHabitId, WorldDef> = {
  agua: AGUA, emprendimiento: EMPRENDIMIENTO, estudiar: ESTUDIAR, gym: GYM, idiomas: IDIOMAS,
  comunicacion: COMUNICACION, alimentacion: ALIMENTACION, lectura: LECTURA, trabajo: TRABAJO, iq: IQ,
  programacion: PROGRAMACION, meditacion: MEDITACION, yoga: YOGA, skincare: SKINCARE, catolica: CATOLICA,
};

export const getWorld = (id: SuperHabitId): WorldDef => WORLDS[id];
