import { globalBus } from '../events/bus.js';

export interface AuditEvent {
  id: string;
  timestamp: string;
  source: string;      // plugin id or 'shell'
  action: string;
  payload: unknown;
  status: 'ok' | 'error' | 'pending';
  sessionId: string;
}

let _auditIdCounter = 0;

function nextAuditId(): string {
  return `audit-${Date.now()}-${++_auditIdCounter}`;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 500;

  log(
    source: string,
    action: string,
    payload: unknown,
    status: AuditEvent['status'] = 'ok',
    sessionId = 'default'
  ): AuditEvent {
    const event: AuditEvent = {
      id: nextAuditId(),
      timestamp: new Date().toISOString(),
      source,
      action,
      payload,
      status,
      sessionId,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Publish to event bus so any subscriber can react
    globalBus.publish('audit.event', 'audit-logger', event).catch(() => {});

    return event;
  }

  getAll(): AuditEvent[] {
    return [...this.events];
  }

  getRecent(limit = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }

  getBySource(source: string): AuditEvent[] {
    return this.events.filter((e) => e.source === source);
  }

  getBySession(sessionId: string): AuditEvent[] {
    return this.events.filter((e) => e.sessionId === sessionId);
  }

  clear(): void {
    this.events = [];
  }
}

export const auditLogger = new AuditLogger();
