# Guía de Generación de APK - Matrix App

¡Tu aplicación está 100% optimizada y lista para convertirse en un APK nativo!

Sigue estos pasos para generar el archivo instalable final.

## Requisitos Previos
- **Android Studio** instalado (con SDK de Android configurado).

## Pasos para Generar APK (Release)

1. **Abrir el proyecto en Android Studio**:
   - Abre Android Studio.
   - Selecciona "Open".
   - Navega a la carpeta de tu proyecto: `.../Matrix_app_resilient/web-app/android` y selecciona esa carpeta.
   - Espera a que Gradle sincronice el proyecto (puede tardar unos minutos la primera vez).

2. **Generar el APK Firmado (Signed APK)**:
   - Ve al menú superior: **Build > Generate Signed Bundle / APK**.
   - Selecciona **APK** y dale a "Next".
   - **Key Store Path**:
     - Si no tienes una llave, haz clic en **Create new...**.
     - Llena los datos (password, alias, etc.) y guarda el archivo `.jks` en un lugar seguro.
     - Si ya tienes una, selecciónala.
   - Dale a "Next".
   - Selecciona **release** (esto activa ProGuard y optimizaciones).
   - Marca ambas casillas (V1 y V2 Signature Versions).
   - Haz clic en **Create** o **Finish**.

3. **Localizar tu APK**:
   - Una vez termine, verás una notificación "Generate Signed APK: APK(s) generated successfully".
   - Haz clic en **locate** en esa notificación, o ve a `web-app/android/app/release/` para encontrar tu archivo `app-release.apk`.

## Comandos Útiles

Si haces cambios en el código web (React), ejecuta estos comandos para actualizar la versión móvil antes de volver a compilar en Android Studio:

```bash
# 1. Construir la web optimizada
npm run build

# 2. Sincronizar con Android
npx cap sync
```

## Optimizaciones Realizadas
- **Vite**: Minificación avanzada (esbuild), separación de chunks (vendor splitting), y eliminación de source maps.
- **Capacitor**: Configuración de Splash Screen rápido y tema oscuro por defecto.
- **UI/UX**: Viewport nativo (sin zoom, cover area), safe-areas configuradas.
- **Assets**: Limpieza de referencias rotas (noise.png).
