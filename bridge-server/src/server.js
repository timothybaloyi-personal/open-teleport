import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 8888);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 120000);

const app = express();
app.use(express.json({ limit: '2mb' }));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws-extension' });

let extensionSocket = null;
const inflight = new Map();

wss.on('connection', (ws) => {
  extensionSocket = ws;
  console.log('[bridge] Chrome extension connected.');

  ws.on('message', (rawData) => {
    let payload;
    try {
      payload = JSON.parse(rawData.toString());
    } catch {
      return;
    }

    if (payload.type === 'chat.completion.response') {
      const pending = inflight.get(payload.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      inflight.delete(payload.requestId);
      pending.resolve(payload.response);
    }

    if (payload.type === 'chat.completion.error') {
      const pending = inflight.get(payload.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      inflight.delete(payload.requestId);
      pending.reject(new Error(payload.error ?? 'Unknown extension error'));
    }
  });

  ws.on('close', () => {
    if (extensionSocket === ws) {
      extensionSocket = null;
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    extensionConnected: Boolean(extensionSocket && extensionSocket.readyState === 1),
    inflightRequests: inflight.size
  });
});

app.post('/message', async (req, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    return res.status(400).json({ error: 'Provide {"message": "..."}' });
  }

  try {
    const completion = await dispatchCompletion({
      model: req.body?.model ?? 'gemini-web-ui',
      messages: [{ role: 'user', content: message }],
      tools: req.body?.tools ?? []
    });
    return res.json(completion);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  const body = req.body ?? {};
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'OpenAI-compatible payload must include messages[]' });
  }

  try {
    const completion = await dispatchCompletion(body);
    return res.json(completion);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

function dispatchCompletion(openAiLikeRequest) {
  if (!extensionSocket || extensionSocket.readyState !== 1) {
    return Promise.reject(new Error('Chrome extension is not connected to ws://localhost:8888/ws-extension'));
  }

  const requestId = randomUUID();
  const envelope = {
    type: 'chat.completion.request',
    requestId,
    request: openAiLikeRequest
  };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      inflight.delete(requestId);
      reject(new Error(`Timed out waiting for extension response (${REQUEST_TIMEOUT_MS} ms)`));
    }, REQUEST_TIMEOUT_MS);

    inflight.set(requestId, { resolve, reject, timeout });
    extensionSocket.send(JSON.stringify(envelope));
  });
}

httpServer.listen(PORT, () => {
  console.log(`[bridge] Listening on http://localhost:${PORT}`);
  console.log('[bridge] Waiting for Chrome extension websocket connection on /ws-extension');
});
