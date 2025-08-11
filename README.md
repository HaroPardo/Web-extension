# WhatsApp Desktop Lite - Lightweight Client

## Key Features ✨

- **Standalone WhatsApp Access** — Usa WhatsApp sin navegador ni la app oficial.
- **Smart Window Behaviors**:
  - 📌 **Always On Top** — Mantén la ventana visible por encima de otras.
  - ⤵️ **Minimize on Focus Loss** — Minimiza automáticamente al hacer click fuera (opcional).
  - ❌ **Close on Focus Loss** — Oculta a la bandeja/sistema al perder foco (opcional).
- **Persistent Sessions** — Mantente conectado entre sesiones.
- **Lightweight** — Uso mínimo de recursos comparado con abrir WhatsApp en un navegador.
- **Cross-Platform** — Funciona en Windows, macOS y Linux.

## Instalación rápida

1. Descarga la carpeta `win-unpacked` desde los artefactos de build (si corresponde).
2. En `win-unpacked` encontrarás todos los archivos del programa y el ejecutable `Social Sidebar.exe`.
3. Para ejecutar la app en Windows, **haz doble click** en `Social Sidebar.exe`.

---

## Uso / Guía rápida 🚀

### Capturas (inclúyelas en el repo)

![Instalación y ejecutable](styles/dist1.png)  
**dist1.png** — Dentro de la carpeta `win-unpacked` están todos los archivos del programa. El archivo ejecutable principal es **`Social Sidebar.exe`**. Haz doble click en este `.exe` para iniciar la aplicación.

![Interfaz y botón Pinned](styles/dist2.png)  
**dist2.png** — Vista de la aplicación en ejecución. El botón aparece como **`Pinned`**, lo que indica que la ventana está en modo *siempre encima* (la aplicación se mantiene visible en el monitor mientras haces otras tareas).  

- Si prefieres que al hacer click fuera de la ventana esta se minimice, usa el botón **Minimize**.  
- Si quieres que la aplicación se oculte (por ejemplo si solo querías enviar un mensaje rápido) usa el botón **Close** para que deje de mostrarse o se envíe a la bandeja (según la configuración).

---

### Controles de la ventana

- **✕ Close Button**: Oculta la app en la bandeja del sistema (comportamiento por defecto / configurable).  
- **— Minimize Button**: Minimiza la ventana a la barra de tareas.  
- **📌 Pin Toggle**:
  - **Estado por defecto — `Pin`**: La aplicación no está fijada (comportamiento normal).  
  - **Estado activo — `Pinned`**: La ventana permanece **siempre encima** de las demás ventanas.

### Selectores de comportamiento (al perder el foco)
Estas opciones definen qué pasa cuando haces click fuera de la ventana:

```plaintext
"Minimize ⤵️" : Minimiza la ventana al hacer click fuera.
"Close ❌"    : Oculta la aplicación (p. ej. a la bandeja) al hacer click fuera.
"None"        : No hacer nada al perder el foco (útil con Pinned).

