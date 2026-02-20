# OpenTeleport AI Bridge

A Chrome extension that enables WebSocket-powered browser automation for AI chat interfaces (starting with Perplexity). Built to work with OpenClaw.

## Features

- **WebSocket Server**: The extension runs a local WebSocket server on port 8080
- **Prompt Injection**: Send prompts from OpenClaw and have them typed into Perplexity
- **Human-Like Behavior**: Random typing delays (50‑150ms) and post‑send waits (1‑15s)
- **Schema Normalization**: Converts Perplexity responses to OpenAI‑compatible format
- **Escalation**: Notifies human on CAPTCHA, rate limits, or connection issues

## Prerequisites

- Chrome or compatible browser (Brave, Edge, etc.)
- Node.js with `ws` library for testing utility: `npm install ws`
- GitHub PAT with repo access (already configured in your environment)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/timothybaloyi-personal/open-teleport.git
cd open-teleport
```

### 2. Load the Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the extension folder (the one containing `manifest.json`)

### 3. Start the WebSocket Server

The extension's background service worker automatically starts the WebSocket server when the extension loads. You should see:
```
WebSocket server started on port 8080
```
in the extension's service worker console (click "service worker" link under the extension in `chrome://extensions/`).

> **Note**: You may need to reload the extension after installing if the server doesn't start automatically.

## Testing

### Test Utility (Windows/Linux/macOS)

From the repository root:

```bash
npm install ws
node test/open-teleport-test.js
```

This will:
1. Connect to the WebSocket server
2. Send a test prompt "What is the capital of France?"
3. Wait 15 seconds for Perplexity to respond
4. Send a second, more complex prompt
5. Disconnect cleanly

### Manual Test (Browser Console)

Open Perplexity AI in a Chrome tab, then run in the DevTools console:

```javascript
// Connect to the WebSocket
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to extension');
  ws.send(JSON.stringify({
    model: 'perplexity',
    prompt: 'What is AI?',
    behaviors: { typingDelay: 100, waitTime: 3000 }
  }));
};

ws.onmessage = (event) => {
  console.log('Response received:', event.data);
};
```

You should see the message being typed into Perplexity's input field, sent, and then the response appear in the Perplexity chat window.

## Integration with OpenClaw

OpenClaw can communicate with this extension by sending JSON messages over WebSocket:

```json
{
  "model": "perplexity",
  "prompt": "Your question here",
  "behaviors": {
    "typingDelay": 100,
    "waitTime": 5000
  }
}
```

The extension will:
1. Inject the prompt into Perplexity's input field with human‑like typing
2. Click the send button
3. Wait for the response to appear in the chat
4. Extract the response and return it via WebSocket in OpenAI‑compatible format

## Error Handling & Escalation

- **CAPTCHA detection**: If a CAPTCHA is detected in the page, the extension will pause and the human is notified
- **Rate limits**: If Perplexity returns a rate‑limit response, the extension backs off exponentially and notifies human if persistent
- **Connection failure**: WebSocket connection failures are logged and can trigger human alerts
- **DOM changes**: If input or send button selectors cannot be found, the error is reported

## Project Structure

```
open-teleport/
├── manifest.json           # Chrome extension manifest
├── background.js           # WebSocket server (service worker)
├── content.js              # Injected script for DOM interaction
├── schemas/
│   └── openai-compatible.js # Perplexity → OpenAI format conversion
├── utils/
│   └── timing.js           # Human-like delay utilities
├── test/
│   └── open-teleport-test.js # Test client for Windows
└── README.md
```

## Development

### Changing the WebSocket Port
Edit `background.js` and change the port number (default: `8080`).

### Extending to Other AI Sites
1. Add the site pattern to `host_permissions` in `manifest.json`
2. Update `content.js` selectors for that site's input and send button
3. Optionally extend `schemas/openai-compatible.js` for that platform's response format

## License

MIT

## Contributing

Please open issues or PRs on the repository: https://github.com/timothybaloyi-personal/open-teleport