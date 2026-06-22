# MCP Landing Editor — Guía de Setup para el Cliente

Servidor MCP que permite a Claude Desktop leer y editar la landing HTML del cliente vía cPanel de Lucus.

---

## 1. Generar el API Token en cPanel de Lucus

1. Acceder al cPanel del cliente: `https://servidor.lucus.es:2083`
2. Ir a **Seguridad → API Tokens**
3. Hacer clic en **Crear token**
4. Nombre: `claude-editor`
5. Copiar y guardar el token generado — solo se muestra una vez

---

## 2. Variables de entorno

Las variables necesarias están definidas en `.env.example`. Crear un archivo `.env` (local) o configurar en Railway:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `CPANEL_URL` | URL del cPanel del cliente (con puerto) | `https://servidor.lucus.es:2083` |
| `CPANEL_USER` | Usuario del cPanel | `usuario_cpanel` |
| `CPANEL_TOKEN` | Token generado en el paso anterior | `TOKEN_GENERADO_EN_CPANEL` |
| `LANDING_DIR` | Ruta del directorio donde está el HTML | `/public_html` |
| `LANDING_FILE` | Nombre del archivo HTML de la landing | `index.html` |
| `SITE_URL` | URL pública del sitio del cliente | `https://www.sitiocliente.com` |
| `PORT` | Puerto del servidor (Railway lo gestiona) | `3000` |

---

## 3. Deploy en Railway

### Pasos

1. Ir a [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Seleccionar el repo `CORE`
3. En la configuración del servicio, establecer:
   - **Root Directory:** `tools/mcp-landing-editor`
4. Railway detecta Node.js automáticamente y ejecuta `npm start`
5. En la pestaña **Variables**, añadir todas las variables de la tabla anterior con los valores reales del cliente
6. Railway genera una URL pública, por ejemplo:
   ```
   https://mcp-landing-editor-production.up.railway.app
   ```

### Verificar el deploy

```bash
curl https://mcp-landing-editor-production.up.railway.app/health
```

Respuesta esperada:

```json
{"ok":true}
```

Si la respuesta no llega, revisar los logs en Railway UI → **Deployments → Logs**.

---

## 4. Configurar Claude Desktop del cliente

### Localizar el archivo de configuración

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
  - Ruta completa: `C:\Users\<usuario>\AppData\Roaming\Claude\claude_desktop_config.json`
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Contenido a añadir

Si el archivo ya tiene otros MCPs, añadir solo la entrada dentro de `mcpServers`. Si el archivo no existe, crearlo con este contenido:

```json
{
  "mcpServers": {
    "landing-editor": {
      "type": "sse",
      "url": "https://mcp-landing-editor-production.up.railway.app/sse"
    }
  }
}
```

Reemplazar la URL con la URL real generada por Railway.

Después de guardar el archivo, **reiniciar Claude Desktop** completamente.

---

## 5. Crear el Claude Project para el cliente

En la cuenta de Claude del cliente:

1. Ir a **Projects → Nuevo Project**
2. Nombre: `Mi Web — Editor`
3. En **Instructions** (system prompt), pegar y personalizar la siguiente plantilla:

```
Eres el asistente de edición de la web de [NOMBRE DEL NEGOCIO].

Tienes acceso a herramientas para leer y modificar la web en vivo:
- leer_landing: descarga el HTML actual
- editar_landing: cambia un fragmento concreto
- guardar_landing: publica los cambios

MARCA:
- Colores principales: [rellenar con los colores del cliente]
- Tipografía: [rellenar]
- Tono de voz: [rellenar]

REGLAS IMPORTANTES:
- Antes de cualquier cambio, usa leer_landing si no tienes el HTML en contexto.
- Para cambios pequeños (un texto, un precio) usa editar_landing.
- Para cambios grandes (reescribir una sección entera) usa leer_landing → modifica en tu cabeza → guardar_landing con el html_completo.
- Confirma siempre lo que vas a cambiar antes de guardar, especialmente si es un cambio grande.
- No toques el formulario de contacto ni los scripts de analytics sin confirmación explícita.
- Responde siempre en [español/el idioma del cliente].
```

Rellenar los marcadores `[...]` con los datos reales del cliente antes de guardar el project.

---

## 6. Verificar que todo funciona

### Verificación rápida (curl)

```bash
curl https://mcp-landing-editor-production.up.railway.app/health
```

Resultado esperado: `{"ok":true}`

### Test E2E con el cliente

Con el cliente delante (o en llamada), pedirle que escriba en el chat de Claude Desktop (dentro del Project configurado):

> "Cambia el título principal de la página"

Verificar que Claude ejecuta en orden:

1. Llama a `leer_landing` — descarga el HTML actual
2. Llama a `editar_landing` — aplica el cambio al fragmento
3. Llama a `guardar_landing` — publica en vivo

4. Recargar el sitio del cliente en el navegador y confirmar que el cambio es visible

Si algo falla:

- Revisar logs en Railway: **UI → Deployments → Logs**
- Confirmar que Claude Desktop fue reiniciado tras editar `claude_desktop_config.json`
- Verificar que la URL del SSE en el config apunta a la URL correcta de Railway
