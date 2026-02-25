# 🛡️ MATRIX: Protocolo de Preservación de Datos (Nivel Bancario)

Este documento detalla la arquitectura de seguridad y redundancia implementada para garantizar que **ningún dato se pierda jamás**, cumpliendo con estándares de robustez financiera.

## 1. Arquitectura de "Soft Delete" (Borrado Lógico)

Hemos eliminado la capacidad de borrar datos físicamente desde la aplicación. 

*   **Antes:** `deleteDoc(ref)` borraba el documento permanentemente. Si era un error, se perdía para siempre.
*   **Ahora:** `setDoc(ref, { deleted: true }, { merge: true })`.
    *   Los datos siguen en la base de datos, pero están ocultos para el usuario.
    *   **Recuperación:** Un administrador puede restaurar cualquier elemento simplemente cambiando `deleted: false`.
    *   **Cobertura:** Aplicado a Proyectos, Hábitos, Tareas, Notas, Blueprints y Usuarios.

## 2. Auditoría Forense (Audit Logging)

Cada operación crítica deja una huella inmutable en la colección `audit_logs`.

*   **Qué se registra:** Creación, Edición, Borrado (Soft), Errores Críticos.
*   **Datos:** Usuario, Timestamp exacto, ID del documento, Tipo de cambio.
*   **Utilidad:** Permite rastrear *quién* borró *qué* y *cuándo*, facilitando la reversión de daños malintencionados o accidentales.

## 3. Reglas de Seguridad (Firestore Rules)

Se ha implementado un firewall lógico en `firestore.rules`:

*   **Bloqueo de DELETE:** Nadie, ni siquiera el dueño de la cuenta, puede ejecutar un comando `DELETE` físico desde la app.
*   **Propiedad Estricta:** Solo el dueño del documento (`request.auth.uid == userId`) puede leer o escribir sus datos.

---

## 4. Estrategia de Respaldo en la Nube (ACCIONES REQUERIDAS)

Para lograr la certificación de "Nivel Bancario", debes activar las siguientes funciones en la Consola de Google Cloud (Firebase). Estas funciones operan a nivel de infraestructura y son la red de seguridad final.

### A. Point-in-Time Recovery (PITR) - **CRÍTICO**

Esta función permite "rebobinar" la base de datos a cualquier segundo exacto de los últimos 7 días.

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/firestore/databases).
2.  Selecciona tu base de datos.
3.  Ve a la pestaña **Backups / Recuperación**.
4.  Activa **Point-in-Time Recovery**.
    *   *Costo:* Mínimo, pero invaluable. Si un bug corrompe toda la DB hoy a las 3:00 PM, puedes restaurarla al estado exacto de las 2:59:59 PM.

### B. Backups Automáticos Diarios

Configura una exportación programada para guardar una copia fría de toda la base de datos.

1.  Abre la terminal de Google Cloud (Cloud Shell) en la consola web.
2.  Ejecuta este comando para crear un bucket de backup (si no tienes uno):
    ```bash
    gsutil mb -p [TU_PROJECT_ID] -l [TU_REGION] gs://[TU_PROJECT_ID]-backups
    ```
3.  Programa el backup diario (ejemplo: cada día a las 3 AM):
    ```bash
    gcloud firestore backups schedules create \
      --database='(default)' \
      --retention=14w \
      --recurrence=daily
    ```
    *Esto guardará una copia completa cada día y la retendrá por 14 semanas.*

## 5. Resumen de Seguridad

| Amenaza | Solución Implementada |
| :--- | :--- |
| **Borrado Accidental por Usuario** | **Soft Delete** (El dato sigue ahí, solo oculto). |
| **Borrado Malintencionado (Hack)** | **Firestore Rules** (Bloquean `delete` físico). |
| **Corrupción de Datos (Bug)** | **PITR** (Rebobinar DB al segundo anterior). |
| **Catástrofe en Google (Data Center)** | **Geo-Redundancia** (Automática en Firebase) + **Backups Diarios**. |
| **Rastreo de Cambios** | **Audit Logger** (Historial forense). |

---

**Estado Actual:** ✅ La aplicación está blindada a nivel de código. Solo falta la activación de PITR en la consola de Google Cloud por parte del administrador.
