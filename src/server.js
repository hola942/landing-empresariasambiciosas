import 'dotenv/config';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { TOOLS } from './tools.js';

const app = express();
app.use(express.json());

// Health check para Railway
app.get('/health', (_req, res) => res.json({ ok: true }));

// Mapa de transports activos por sessionId
const transports = {};

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = new McpServer({
    name: 'landing-editor',
    version: '1.0.0',
  });

  // Registrar las 3 herramientas
  for (const [, tool] of Object.entries(TOOLS)) {
    server.tool(
      tool.definition.name,
      tool.definition.description,
      tool.definition.inputSchema.properties,
      (args) => tool.handler(args),
    );
  }

  transports[transport.sessionId] = transport;
  res.on('close', () => delete transports[transport.sessionId]);

  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) {
    return res.status(404).json({ error: 'Session not found' });
  }
  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MCP landing-editor escuchando en :${PORT}`));
