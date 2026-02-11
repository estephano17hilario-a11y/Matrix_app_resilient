# Auditoría de Autenticación y Errores de Red - Matrix App

## 1. Resumen Ejecutivo
Se ha detectado un error crítico `auth/network-request-failed` durante el proceso de autenticación (Login/Registro). Este error impide que los usuarios accedan a la aplicación, indicando una falla en la comunicación entre el cliente (Frontend) y los servicios de Firebase Auth.

**Severidad:** Crítica (Bloqueante)
**Componente Afectado:** Módulo de Autenticación (`AuthView.tsx`, `firebase.ts`)

## 2. Análisis de Logs y Traza
El error reportado es:
```
[error] Auth Error: FirebaseError: Firebase: Error (auth/network-request-failed).
at console.error (http://localhost:5174/src/main.tsx:8:2)
at handleSubmit (http://localhost:5174/src/modules/auth/AuthView.tsx:179:14)
```

**Hallazgos:**
1.  **Origen:** El error se dispara en la función `handleSubmit` de `AuthView.tsx` al llamar a `signInWithEmailAndPassword` o `createUserWithEmailAndPassword`.
2.  **Naturaleza:** `network-request-failed` es un error de bajo nivel que indica que la petición HTTP subyacente falló por completo (no hubo respuesta del servidor).
3.  **Configuración:** La configuración de Firebase en `src/services/firebase.ts` parece correcta sintácticamente y utiliza variables de entorno (`VITE_FIREBASE_*`).
4.  **Versión SDK:** Se utiliza `firebase@12.6.0`, una versión muy reciente.

## 3. Puntos de Fallo Identificados

### A. Infraestructura y Red (Factores Externos)
*   **Conectividad del Cliente:** El usuario podría estar offline o con una conexión inestable.
*   **Bloqueo de CORS/Firewall:** Si se ejecuta en `localhost`, el navegador podría estar bloqueando la petición si no se ha configurado `localhost` como dominio autorizado en la consola de Firebase.
*   **Bloqueadores de Publicidad/Rastreo:** Extensiones tipo uBlock Origin pueden bloquear peticiones a `googleapis.com` o `google-analytics`.

### B. Arquitectura de la Aplicación (Factores Internos)
*   **Falta de Verificación de Estado:** La aplicación intenta realizar la autenticación sin verificar previamente si hay conexión a internet.
*   **Ausencia de Mecanismo de Reintento:** No hay lógica de "Retry" (Exponential Backoff) para fallos de red transitorios.
*   **Manejo de Errores Reactivo:** El error se captura, pero la UI solo muestra un mensaje genérico sin ofrecer soluciones al usuario (ej: "Reintentar", "Verificar conexión").
*   **Inicialización de Firebase:** Aunque robusta para Firestore, la inicialización de Auth no tiene mecanismos de fallback explícitos si falla la carga inicial de dependencias de red.

## 4. Recomendaciones de Mitigación

### Prioridad Alta (Inmediato)
1.  **Validación de Conectividad Previa:** Implementar un chequeo de `navigator.onLine` y un "ping" ligero antes de intentar el login.
2.  **Feedback Visual de Estado:** Mostrar un indicador claro si la aplicación está en modo "Offline".
3.  **Mejora en el Manejo de Errores:** Diferenciar entre "Sin internet" y "Servidor caído" en los mensajes al usuario.

### Prioridad Media
1.  **Implementar Reintentos Automáticos:** Agregar una utilidad que reintente la operación de login 3 veces con un pequeño retraso si falla por error de red.
2.  **Auditoría de CORS (Acción Manual Requerida):** Verificar en la Consola de Firebase -> Authentication -> Settings -> Authorized Domains que `localhost` esté permitido.

## 5. Plan de Acción Técnica
1.  Modificar `AuthView.tsx` para detectar estado offline.
2.  Crear utilidad `isNetworkAvailable()` en `src/utils/networkUtils.ts`.
3.  Implementar lógica de reintento en el submit.

