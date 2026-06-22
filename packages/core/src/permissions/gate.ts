export type PermissionLevel = 'none' | 'read' | 'write' | 'execute' | 'admin';

export interface ApprovalRequest {
  id: string;
  pluginId: string;
  permission: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  resolvedAt?: string;
  resolvedBy?: string;
}

type ApprovalHandler = (request: ApprovalRequest) => void;

export class PermissionGate {
  private granted: Map<string, Set<string>> = new Map(); // pluginId -> Set<permission>
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalHandlers: ApprovalHandler[] = [];
  private _idCounter = 0;

  /**
   * Grant a permission to a plugin without approval.
   */
  grant(pluginId: string, permission: string): void {
    if (!this.granted.has(pluginId)) {
      this.granted.set(pluginId, new Set());
    }
    this.granted.get(pluginId)!.add(permission);
  }

  /**
   * Revoke a permission from a plugin.
   */
  revoke(pluginId: string, permission: string): void {
    this.granted.get(pluginId)?.delete(permission);
  }

  /**
   * Check if a plugin has a specific permission.
   */
  check(pluginId: string, permission: string): boolean {
    return this.granted.get(pluginId)?.has(permission) ?? false;
  }

  /**
   * Check all permissions for a plugin manifest's declared permissions.
   */
  checkAll(pluginId: string, permissions: string[]): { granted: string[]; denied: string[] } {
    const granted: string[] = [];
    const denied: string[] = [];
    for (const p of permissions) {
      if (this.check(pluginId, p)) {
        granted.push(p);
      } else {
        denied.push(p);
      }
    }
    return { granted, denied };
  }

  /**
   * Submit a permission approval request.
   */
  requestApproval(pluginId: string, permission: string, reason: string): ApprovalRequest {
    const id = `approval-${++this._idCounter}`;
    const request: ApprovalRequest = {
      id,
      pluginId,
      permission,
      reason,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    this.pendingApprovals.set(id, request);
    this.approvalHandlers.forEach((h) => h(request));
    return request;
  }

  approve(requestId: string, resolvedBy = 'user'): boolean {
    const req = this.pendingApprovals.get(requestId);
    if (!req || req.status !== 'pending') return false;
    req.status = 'approved';
    req.resolvedAt = new Date().toISOString();
    req.resolvedBy = resolvedBy;
    this.grant(req.pluginId, req.permission);
    return true;
  }

  deny(requestId: string, resolvedBy = 'user'): boolean {
    const req = this.pendingApprovals.get(requestId);
    if (!req || req.status !== 'pending') return false;
    req.status = 'denied';
    req.resolvedAt = new Date().toISOString();
    req.resolvedBy = resolvedBy;
    return true;
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter((r) => r.status === 'pending');
  }

  onApprovalRequest(handler: ApprovalHandler): void {
    this.approvalHandlers.push(handler);
  }
}

export const globalPermissionGate = new PermissionGate();
