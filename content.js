// Content script for Perplexity AI interaction
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'type') {
    const { prompt, behaviors } = request;
    simulateTyping(prompt, behaviors);
  }
});

function simulateTyping(text, behaviors) {
  const input = document.querySelector('#prompt-input') || 
                document.querySelector('[data-testid="prompt-input"]') ||
                document.querySelector('textarea');
  
  if (!input) {
    console.error('Could not find input element on Perplexity page');
    return;
  }

  const sendBtn = document.querySelector('#send-btn') || 
                  document.querySelector('[data-testid="send-btn"]') ||
                  document.querySelector('button[type="submit"]');

  // Simulate typing with random delays
  let i = 0;
  const typingSpeed = behaviors.typingDelay || 100; // ms per character
  const typingLoop = setInterval(() => {
    if (i < text.length) {
      const char = text[i];
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      i++;
    } else {
      clearInterval(typingLoop);
      // Wait a random time before sending (1-4 seconds)
      const randomWait = Math.random() * 3000 + 1000;
      setTimeout(() => {
        if (sendBtn) {
          sendBtn.click();
        } else {
          // Try to submit with Enter key
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
        }
      }, randomWait);
    }
  }, typingSpeed);
}

// Expose for debugging
window.openTeleportDebug = { simulateTyping };