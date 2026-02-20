// OpenAI-compatible response schema converter
class OpenAIConverter {
  static toOpenAIChatCompletion(perplexityResponse) {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'perplexity',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: this.extractContent(perplexityResponse)
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  static extractContent(response) {
    // Perplexity responses are typically in a structured container
    // Try multiple selectors
    const contentEl = document.querySelector('[data-testid="response-content"]') ||
                      document.querySelector('.markdown') ||
                      document.querySelector('[class*="response"]') ||
                      document.body;
    
    return contentEl ? contentEl.textContent.trim() : response;
  }

  static parseYAML(yamlText) {
    // Simple YAML parser for the Web Audit Mode schema
    const lines = yamlText.split('\n');
    const result = {};
    let currentKey = null;
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        currentKey = match[1];
        result[currentKey] = match[2].trim();
      } else if (currentKey && line.trim()) {
        result[currentKey] += '\n' + line.trim();
      }
    }
    
    return result;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpenAIConverter;
}

window.OpenAIConverter = OpenAIConverter;