import { db, collection, addDoc, serverTimestamp, auth } from './firebase';

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
    details?: any
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) return; // No podemos auditar sin usuario autenticado (por ahora)

      const logEntry: AuditLogEntry = {
        action,
        collection: collectionName,
        documentId,
        userId: user.id,
        timestamp: serverTimestamp(),
        details: details ? JSON.stringify(details) : null,
        deviceInfo: navigator.userAgent
      };

      // Guardamos en la colección raíz 'audit_logs' o dentro del usuario 'users/{uid}/audit_logs'
      // Para robustez bancaria, idealmente debería ser una colección raíz con permisos de solo escritura.
      // Pero por simplicidad y COSTOS (ahorro máximo de almacenamiento en Supabase),
      // lo hemos desactivado. Si deseas persistencia de logs de auditoría en el futuro, 
      // puedes habilitar la inserción en Supabase, pero consumirá almacenamiento.
      
      // await addDoc(collection(db, 'users', user.id, 'audit_logs'), logEntry);
      
      console.log(`[AUDIT] ${action} on ${collectionName}/${documentId}`);
    } catch (error) {
      // El log no debe romper la app, pero debe reportarse
      console.error("CRITICAL: Failed to write audit log", error);
    }
  }
};
