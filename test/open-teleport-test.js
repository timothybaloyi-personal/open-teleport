// Test utility for OpenTeleport extension (Node.js)
// Usage: node test/open-teleport-test.js

const WebSocket = require('ws');

class OpenTeleportTester {
  constructor(wsUrl = 'ws://localhost:8080') {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.timeout = 30000; // 30 second timeout
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to extension WebSocket server');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), this.timeout);
    });
  }

  async sendMessage(prompt, behaviors = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message = {
      model: 'perplexity',
      prompt,
      behaviors: {
        typingDelay: behaviors.typingDelay || 100,
        waitTime: behaviors.waitTime || 3000,
        ...behaviors
      }
    };

    const response = await this.waitForResponse();
    this.ws.send(JSON.stringify(message));
    console.log('📤 Sent message to Perplexity:', { prompt, behaviors });
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, this.timeout);

      this.ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data);
          clearTimeout(timer);
          resolve(parsed);
        } catch (e) {
          console.log('📥 Received response:', data.toString());
          resolve(data.toString());
        }
      });
    });
  }

  waitForResponse() {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 Disconnected from WebSocket server');
    }
  }
}

// --- Main Test Flow ---
(async () => {
  const tester = new OpenTeleportTester();
  
  try {
    await tester.connect();
    
    // Test 1: Simple question
    console.log('\n🧪 Test 1: Sending simple question...');
    const response1 = await tester.sendMessage('What is the capital of France?');
    console.log('Test 1 complete:', response1);
    
    // Wait for Perplexity to respond (give it time to type and answer)
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Test 2: More complex question
    console.log('\n🧪 Test 2: Sending complex question...');
    const response2 = await tester.sendMessage(
      'Explain the concept of sustainable AI in 3 bullet points.',
      { typingDelay: 150, waitTime: 4000 }
    );
    console.log('Test 2 complete:', response2);
    
    console.log('\n✅ All tests completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    tester.disconnect();
  }
})();