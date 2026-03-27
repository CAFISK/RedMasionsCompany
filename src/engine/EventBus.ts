/**
 * EventBus - Central event system for the engine.
 * Provides pub/sub pattern for decoupled communication between modules.
 */
export class EventBus {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Subscribe to an event, auto-unsubscribe after first trigger
   */
  once(event: string, handler: (...args: unknown[]) => void): void {
    const wrapper = (...args: unknown[]) => {
      handler(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit an event with optional arguments
   */
  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    });
  }

  /**
   * Remove all listeners for a specific event, or all events
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
