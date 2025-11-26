// src/utils/circuit-breaker.ts
import { logger } from "./logger";

export class CircuitBreaker {
    private failures = 0;
    private lastFailTime = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';
  
    constructor(
      private threshold = 5,
      private timeout = 60000,
      private resetTimeout = 30000
    ) {}
  
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (this.state === 'open') {
        if (Date.now() - this.lastFailTime > this.resetTimeout) {
          this.state = 'half-open';
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }
  
      try {
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (err) {
        this.onFailure();
        throw err;
      }
    }
  
    private onSuccess() {
      this.failures = 0;
      this.state = 'closed';
    }
  
    private onFailure() {
      this.failures++;
      this.lastFailTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.warn('[CircuitBreaker] Opened after', this.failures, 'failures');
      }
    }
  }
 