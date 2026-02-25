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
        userId: user.uid,
        timestamp: serverTimestamp(),
        details: details ? JSON.stringify(details) : null,
        deviceInfo: navigator.userAgent
      };

      // Guardamos en la colección raíz 'audit_logs' o dentro del usuario 'users/{uid}/audit_logs'
      // Para robustez bancaria, idealmente debería ser una colección raíz con permisos de solo escritura.
      // Pero por simplicidad y costos, lo guardaremos en una subcolección del usuario por ahora,
      // protegida por reglas de seguridad (create: true, update/delete: false).
      
      await addDoc(collection(db, 'users', user.uid, 'audit_logs'), logEntry);
      
      console.log(`[AUDIT] ${action} on ${collectionName}/${documentId}`);
    } catch (error) {
      // El log no debe romper la app, pero debe reportarse
      console.error("CRITICAL: Failed to write audit log", error);
    }
  }
};
