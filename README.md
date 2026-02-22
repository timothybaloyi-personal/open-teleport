# Open-Teleport

Open-Teleport is a local bridge that lets OpenAI-compatible clients talk to Gemini Web UI through a Chrome extension.

## Architecture

1. A lightweight Node.js bridge server listens on `localhost:8888`.
2. The Chrome extension opens a websocket to `ws://localhost:8888/ws-extension`.
3. Your app calls `POST /v1/chat/completions` (or `POST /message`) on the bridge.
4. The bridge forwards the request to the extension.
5. The extension transforms the request into a Gemini-friendly prompt with system rules.
6. The extension injects the prompt into Gemini UI, waits for the response, normalizes it to OpenAI-style JSON, and returns it through websocket.
7. The bridge returns the response back to the caller.

## Project Layout

- `bridge-server/` – Express + ws server for local API and extension messaging.
- `extension/` – Manifest V3 extension with:
  - `background.js` websocket client + request translator.
  - `content-script.js` Gemini UI prompt injection and response scraping.

## Quick Start

### 1) Run the bridge server

```bash
cd bridge-server
npm install
npm start
```

The bridge exposes:

- `GET /health`
- `POST /message`
- `POST /v1/chat/completions`

### 2) Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` directory.
4. Open `https://gemini.google.com/app` and keep the tab signed in.

The extension will auto-connect to `ws://localhost:8888/ws-extension`.

### 3) Send a test request

Simple message API:

```bash
curl -sS http://localhost:8888/message \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hi"}'
```

OpenAI-compatible API:

```bash
curl -sS http://localhost:8888/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"gemini-web-ui",
    "messages":[
      {"role":"system","content":"You are helpful."},
      {"role":"user","content":"Hi"}
    ]
  }'
```

## Prompt Rules Applied by Extension

The extension prepends these rules before passing the conversation to Gemini:

- Response must be short and concise.
- Avoid prose and prefer colourful responses.
- Tool calls are allowed for local resource control.
- Tool calls must appear after a literal `tools section` heading.

## Limitations

- Gemini DOM selectors can change; content-script selectors may need maintenance.
- Streaming responses are not implemented yet (returns non-stream OpenAI response).
- Token usage is currently placeholder values (`0`).

## License

MIT License - see [LICENSE](LICENSE) file for details.
