export interface MorphiusEvent {
  type: string;
  source: string;
  payload: unknown;
  timestamp: string;
  id: string;
}

type EventHandler = (event: MorphiusEvent) => void | Promise<void>;

interface Subscription {
  id: string;
  pattern: string;
  handler: EventHandler;
  isWildcard: boolean;
}

let _subIdCounter = 0;

function nextSubId(): string {
  return `sub-${++_subIdCounter}`;
}

export class EventBus {
  private subscriptions: Map<string, Subscription> = new Map();
  private history: MorphiusEvent[] = [];
  private maxHistory: number;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Subscribe to events matching a pattern.
   * Use '*' to subscribe to all events.
   * Use 'response.*' to match all events starting with 'response.'.
   */
  subscribe(pattern: string, handler: EventHandler): string {
    const id = nextSubId();
    const isWildcard = pattern.includes('*');
    this.subscriptions.set(id, { id, pattern, handler, isWildcard });
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  async publish(type: string, source: string, payload: unknown): Promise<void> {
    const event: MorphiusEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      source,
      payload,
      timestamp: new Date().toISOString(),
    };

    // Store in history (ring buffer)
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Dispatch to matching subscribers
    const promises: Promise<void>[] = [];
    for (const sub of this.subscriptions.values()) {
      if (this.matches(sub.pattern, type)) {
        const result = sub.handler(event);
        if (result instanceof Promise) {
          promises.push(result.catch((err) => console.error(`[EventBus] Handler error for "${type}":`, err)));
        }
      }
    }
    await Promise.all(promises);
  }

  private matches(pattern: string, eventType: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return pattern === eventType;
    // Simple glob: 'response.*' matches 'response.complete', 'response.token', etc.
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(eventType);
  }

  getHistory(): MorphiusEvent[] {
    return [...this.history];
  }

  getHistoryByType(type: string): MorphiusEvent[] {
    return this.history.filter((e) => e.type === type);
  }

  clearHistory(): void {
    this.history = [];
  }

  subscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Singleton instance
export const globalBus = new EventBus();
