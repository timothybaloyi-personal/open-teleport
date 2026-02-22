chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'OPEN_TELEPORT_SUBMIT_PROMPT') return;

  submitPromptAndWait(message.payload)
    .then((text) => sendResponse({ ok: true, text }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function submitPromptAndWait({ prompt, timeoutMs }) {
  const input = await waitForElement('textarea');
  input.focus();
  input.value = prompt;
  input.dispatchEvent(new Event('input', { bubbles: true }));

  const sendButton = findSendButton();
  if (!sendButton) {
    throw new Error('Could not find Gemini send button.');
  }
  sendButton.click();

  return waitForFinalResponse(timeoutMs);
}

function findSendButton() {
  const candidates = [...document.querySelectorAll('button')];
  return candidates.find((button) => {
    const label = `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`.toLowerCase();
    return label.includes('send') || label.includes('submit');
  });
}

async function waitForFinalResponse(timeoutMs = 120000) {
  const start = Date.now();
  let stableText = '';
  let stableCycles = 0;

  while (Date.now() - start < timeoutMs) {
    const text = collectLatestAssistantText();
    if (text && text === stableText) {
      stableCycles += 1;
      if (stableCycles >= 3) {
        return text;
      }
    } else if (text) {
      stableText = text;
      stableCycles = 0;
    }

    await sleep(1000);
  }

  throw new Error('Timed out waiting for Gemini response to stabilize.');
}

function collectLatestAssistantText() {
  const blocks = [
    ...document.querySelectorAll('model-response'),
    ...document.querySelectorAll('[data-message-author-role="assistant"]'),
    ...document.querySelectorAll('.model-response-text')
  ];

  if (blocks.length === 0) return '';
  const latest = blocks[blocks.length - 1];
  return latest.textContent?.trim() ?? '';
}

function waitForElement(selector, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const target = document.querySelector(selector);
      if (target) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(target);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeoutMs);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
