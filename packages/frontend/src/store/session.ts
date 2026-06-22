import { create } from 'zustand';
import type { AuditEventDTO } from '../api/client.js';

export interface TaskOutput {
  id: string;
  pluginId: string;
  action: string;
  output: unknown;
  timestamp: string;
  status: 'ok' | 'error' | 'pending';
}

export interface PendingApproval {
  id: string;
  pluginId: string;
  permission: string;
  reason: string;
  requestedAt: string;
}

interface SessionState {
  sessionId: string;
  currentTask: string;
  outputs: TaskOutput[];
  auditEvents: AuditEventDTO[];
  approvals: PendingApproval[];
  isProcessing: boolean;

  setCurrentTask: (task: string) => void;
  addOutput: (output: TaskOutput) => void;
  clearOutputs: () => void;
  setAuditEvents: (events: AuditEventDTO[]) => void;
  addAuditEvent: (event: AuditEventDTO) => void;
  addApproval: (approval: PendingApproval) => void;
  resolveApproval: (id: string) => void;
  setProcessing: (processing: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: `session-${Date.now()}`,
  currentTask: '',
  outputs: [],
  auditEvents: [],
  approvals: [],
  isProcessing: false,

  setCurrentTask: (currentTask) => set({ currentTask }),
  addOutput: (output) =>
    set((state) => ({ outputs: [...state.outputs.slice(-49), output] })),
  clearOutputs: () => set({ outputs: [] }),
  setAuditEvents: (auditEvents) => set({ auditEvents }),
  addAuditEvent: (event) =>
    set((state) => ({
      auditEvents: [event, ...state.auditEvents].slice(0, 100),
    })),
  addApproval: (approval) =>
    set((state) => ({ approvals: [...state.approvals, approval] })),
  resolveApproval: (id) =>
    set((state) => ({ approvals: state.approvals.filter((a) => a.id !== id) })),
  setProcessing: (isProcessing) => set({ isProcessing }),
}));
