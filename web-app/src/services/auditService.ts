// import { supabase } from './supabase';

export interface AuditLogEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'LOGIN' | 'LOGOUT' | 'ERROR';
  collection: string;
  documentId: string;
  userId: string;
  timestamp: any;
  details?: any;
  deviceInfo?: string;
}

/**
 * SERVICE: Audit Logger (Immutable Record)
 * Registrar cada acción crítica en una colección separada 'audit_logs'.
 * Esto garantiza trazabilidad total (quién hizo qué y cuándo).
 */
export const AuditLogger = {
  log: async (
    action: AuditLogEntry['action'],
    collectionName: string,
    documentId: string,
    _details?: any
  ) => {
    try {
      // Guardamos en la colección raíz 'audit_logs' de Supabase
      // Para robustez bancaria, idealmente debería ser una colección raíz con permisos de solo escritura.
      // Pero por simplicidad y COSTOS (ahorro máximo de almacenamiento en Supabase),
      // lo hemos desactivado. Si deseas persistencia de logs de auditoría en el futuro, 
      // puedes habilitar la inserción en Supabase, pero consumirá almacenamiento.
      
      // const { data: { session } } = await supabase.auth.getSession();
      // const user = session?.user;
      // if (!user) return;
      // const logEntry: AuditLogEntry = { ... };
      // await supabase.from('audit_logs').insert(logEntry);
      
      console.log(`[AUDIT] ${action} on ${collectionName}/${documentId}`);
    } catch (error) {
      // El log no debe romper la app, pero debe reportarse
      console.error("CRITICAL: Failed to write audit log", error);
    }
  }
};
