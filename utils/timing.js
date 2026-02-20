// Timing utilities for human-like behavior
class HumanTiming {
  static async typeWithDelay(text, delay = 100) {
    return new Promise((resolve) => {
      let i = 0;
      const typingLoop = setInterval(() => {
        if (i < text.length) {
          const char = text[i];
          // Simulate random typing speed (50-150ms)
          const randomDelay = Math.random() * 100 + 50;
          setTimeout(() => {
            // Simulate key press
            i++;
            if (i === text.length) {
              clearInterval(typingLoop);
              resolve();
            }
          }, randomDelay);
        }
      }, delay);
    });
  }

  static async humanWait(min = 1000, max = 4000) {
    const waitTime = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, waitTime));
  }

  static randomDelay(base = 100, variance = 50) {
    return base + Math.random() * variance * 2 - variance;
  }

  static async simulateReading(text) {
    const words = text.split(' ').length;
    const readingTime = words * 200 + Math.random() * 1000; // 200ms per word + random
    return new Promise(resolve => setTimeout(resolve, readingTime));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HumanTiming;
}

// Expose globally for debugging
window.HumanTiming = HumanTiming;
