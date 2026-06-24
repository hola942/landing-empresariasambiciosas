import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOLS } from './tools.js';

const app = express();
app.use(express.json());

// Health check para Railway
app.get('/health', (_req, res) => res.json({ ok: true }));

// Zod schemas para cada herramienta
const SCHEMAS = {
  leer_landing: {},
  editar_landing: {
    buscar: z.string().describe('Texto exacto (o expresión regular si usar_regex=true) a buscar en el HTML.'),
    reemplazar: z.string().describe('Texto con el que sustituir el fragmento encontrado.'),
    usar_regex: z.boolean().optional().default(false).describe('Si es true, "buscar" se interpreta como expresión regular.'),
  },
  guardar_landing: {
    html_completo: z.string().optional().describe('Si lo proporcionas, sube este HTML en lugar del que hay en memoria.'),
  },
};

function createMcpServer() {
  const server = new McpServer({ name: 'landing-editor', version: '1.0.0' });
  for (const [, tool] of Object.entries(TOOLS)) {
    server.tool(
      tool.definition.name,
      tool.definition.description,
      SCHEMAS[tool.definition.name],
      (args) => tool.handler(args),
    );
  }
  return server;
}

// --- Streamable HTTP (claude.ai web) ---
const httpTransports = {};

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport = httpTransports[sessionId];

  if (!transport) {
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    const server = createMcpServer();
    await server.connect(transport);
    httpTransports[transport.sessionId] = transport;
    res.on('close', () => delete httpTransports[transport.sessionId]);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const transport = httpTransports[sessionId];
  if (!transport) return res.status(404).json({ error: 'Session not found' });
  await transport.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const transport = httpTransports[sessionId];
  if (transport) {
    await transport.close();
    delete httpTransports[sessionId];
  }
  res.status(200).end();
});

// --- SSE (Claude Desktop) ---
const sseTransports = {};

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();
  sseTransports[transport.sessionId] = transport;
  res.on('close', () => delete sseTransports[transport.sessionId]);
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = sseTransports[sessionId];
  if (!transport) return res.status(404).json({ error: 'Session not found' });
  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MCP landing-editor escuchando en :${PORT}`));
