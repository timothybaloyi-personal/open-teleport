const WS_URL = 'ws://localhost:8888/ws-extension';
const RESPONSE_TIMEOUT_MS = 120000;

let socket;
let reconnectTimer;

connect();

function connect() {
  clearTimeout(reconnectTimer);
  socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    console.log('[open-teleport] connected to bridge server');
  });

  socket.addEventListener('message', async (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (message.type !== 'chat.completion.request') return;

    try {
      const response = await handleCompletion(message.request);
      socket.send(
        JSON.stringify({
          type: 'chat.completion.response',
          requestId: message.requestId,
          response
        })
      );
    } catch (error) {
      socket.send(
        JSON.stringify({
          type: 'chat.completion.error',
          requestId: message.requestId,
          error: error.message
        })
      );
    }
  });

  socket.addEventListener('close', () => {
    reconnectTimer = setTimeout(connect, 2000);
  });

  socket.addEventListener('error', () => {
    socket.close();
  });
}

async function handleCompletion(openAiRequest) {
  const prompt = buildGeminiPrompt(openAiRequest);
  const tab = await ensureGeminiTab();

  const result = await chrome.tabs.sendMessage(tab.id, {
    type: 'OPEN_TELEPORT_SUBMIT_PROMPT',
    payload: { prompt, timeoutMs: RESPONSE_TIMEOUT_MS }
  });

  if (!result?.ok) {
    throw new Error(result?.error ?? 'Gemini content script failed to produce a response.');
  }

  return toOpenAiResponse(openAiRequest, result.text);
}

function buildGeminiPrompt(openAiRequest) {
  const instructionBlock = [
    'SYSTEM RULES:',
    '- Your response must be short and concise, with no prose and colourful responses.',
    '- You can control local resources via tool calls when needed.',
    '- If using tools, include them only after a literal heading: "tools section".',
    '- Keep tool calls machine-readable JSON.',
    '',
    'CONVERSATION:'
  ];

  const conversation = (openAiRequest.messages ?? [])
    .map((message) => `${String(message.role).toUpperCase()}: ${normalizeContent(message.content)}`)
    .join('\n');

  const tools = Array.isArray(openAiRequest.tools) && openAiRequest.tools.length > 0
    ? `\n\nAVAILABLE TOOLS:\n${JSON.stringify(openAiRequest.tools, null, 2)}`
    : '';

  return `${instructionBlock.join('\n')}\n${conversation}${tools}`;
}

function normalizeContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : JSON.stringify(part)))
      .join('\n');
  }
  return JSON.stringify(content ?? '');
}

function toOpenAiResponse(openAiRequest, geminiText) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `chatcmpl_${crypto.randomUUID().replace(/-/g, '')}`,
    object: 'chat.completion',
    created: now,
    model: openAiRequest.model ?? 'gemini-web-ui',
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: geminiText
        }
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

async function ensureGeminiTab() {
  const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  if (tabs.length > 0) return tabs[0];

  const created = await chrome.tabs.create({ url: 'https://gemini.google.com/app' });
  await delay(5000);
  return created;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
