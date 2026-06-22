import { readFile, saveFile, saveBackup } from './cpanel.js';

// Estado en memoria: el HTML actual cacheado para evitar lecturas repetidas
let cachedHtml = null;

export const TOOLS = {
  leer_landing: {
    definition: {
      name: 'leer_landing',
      description: 'Descarga y devuelve el HTML actual de la landing del cliente desde el servidor.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      cachedHtml = await readFile();
      return {
        content: [{ type: 'text', text: cachedHtml }],
      };
    },
  },

  editar_landing: {
    definition: {
      name: 'editar_landing',
      description: 'Sustituye un fragmento exacto del HTML por otro. Usa esto para cambios quirúrgicos (un texto, un precio, un color). Los cambios se aplican en memoria; llama a guardar_landing para publicarlos.',
      inputSchema: {
        type: 'object',
        properties: {
          buscar: {
            type: 'string',
            description: 'Texto exacto (o expresión regular si usar_regex=true) a buscar en el HTML.',
          },
          reemplazar: {
            type: 'string',
            description: 'Texto con el que sustituir el fragmento encontrado.',
          },
          usar_regex: {
            type: 'boolean',
            description: 'Si es true, "buscar" se interpreta como expresión regular.',
            default: false,
          },
        },
        required: ['buscar', 'reemplazar'],
      },
    },
    handler: async ({ buscar, reemplazar, usar_regex = false }) => {
      if (!cachedHtml) {
        cachedHtml = await readFile();
      }
      const pattern = usar_regex ? new RegExp(buscar, 's') : buscar;
      const hasMatch = usar_regex ? pattern.test(cachedHtml) : cachedHtml.includes(buscar);
      if (!hasMatch) {
        return {
          content: [{ type: 'text', text: `No encontré ese fragmento en el HTML. Verifica que el texto es exactamente igual, incluyendo mayúsculas y espacios.` }],
        };
      }
      cachedHtml = cachedHtml.replace(pattern, reemplazar);
      return {
        content: [{ type: 'text', text: `Fragmento sustituido en memoria. Llama a guardar_landing para publicar el cambio.` }],
      };
    },
  },

  guardar_landing: {
    definition: {
      name: 'guardar_landing',
      description: 'Publica el HTML modificado en el servidor. Crea un backup automático antes de sobrescribir. Úsalo después de editar_landing o cuando quieras subir un HTML completo.',
      inputSchema: {
        type: 'object',
        properties: {
          html_completo: {
            type: 'string',
            description: 'Opcional. Si lo proporcionas, sube este HTML en lugar del que hay en memoria (útil para reescrituras completas de secciones).',
          },
        },
        required: [],
      },
    },
    handler: async ({ html_completo } = {}) => {
      const contenido = html_completo || cachedHtml;
      if (!contenido) {
        return {
          content: [{ type: 'text', text: `No hay HTML para guardar. Llama primero a leer_landing o proporciona html_completo.` }],
        };
      }
      await saveBackup(contenido);
      await saveFile(contenido);
      cachedHtml = contenido;
      const siteUrl = process.env.SITE_URL || '(sitio del cliente)';
      return {
        content: [{ type: 'text', text: `✓ Cambios publicados en ${siteUrl}. Se ha creado un backup automático por si necesitas revertir.` }],
      };
    },
  },
};
