
import { db, auth } from './firebase';
import { getDoc, doc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

export interface PendingAIScanReport {
  id: string;
  diagnosis: string;
  score: number;
  alert: boolean;
  health?: SystemHealth;
  logs: SystemLog[];
  systemInfo: Record<string, unknown>;
  userEmail?: string;
  timestamp: string;
}

export interface SystemLog {
  id?: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  module: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  database: boolean;
  auth: boolean;
  lastCheck: string;
  errors: number;
}

class SystemHealthService {
  private logs: SystemLog[] = [];
  private maxLogs = 100;
  private pendingAlerts: PendingAIScanReport[] = [];

  async log(type: SystemLog['type'], module: string, message: string, details?: any) {
    const logEntry: SystemLog = {
      type,
      module,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    console.log(`[${type}] [${module}] ${message}`, details || '');

    // Save to local memory
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) this.logs.pop();

    // Save to Firebase if critical or error
    if (type === 'ERROR' || type === 'CRITICAL') {
      try {
        const logsRef = collection(db, 'system_logs');
        await addDoc(logsRef, logEntry);
      } catch (err) {
        console.error('Failed to persist system log:', err);
      }
    }
  }

  async checkHealth(): Promise<SystemHealth> {
    let dbStatus = false;
    let authStatus = !!auth.currentUser;
    let errors = 0;

    try {
      // Simple ping to firestore
      const pingRef = doc(db, 'system', 'ping');
      await getDoc(pingRef);
      dbStatus = true;
    } catch (err) {
      this.log('ERROR', 'DATABASE', 'Failed to connect to Firestore', err);
      errors++;
    }

    const status = errors === 0 ? 'HEALTHY' : errors < 2 ? 'DEGRADED' : 'CRITICAL';

    return {
      status,
      database: dbStatus,
      auth: authStatus,
      lastCheck: new Date().toISOString(),
      errors
    };
  }

  async getPersistentLogs(count: number = 50): Promise<SystemLog[]> {
    try {
      const logsRef = collection(db, 'system_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(count));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemLog));
    } catch (err) {
      console.error('Failed to fetch persistent logs:', err);
      return [];
    }
  }

  getLocalLogs() {
    return this.logs;
  }

  /** Adiciona alerta em memória (disponível até logout). Admin seleciona quais enviar ao Firebase. */
  addPendingAlert(report: {
    diagnosis: string;
    score: number;
    alert: boolean;
    health: SystemHealth;
    logs: SystemLog[];
    systemInfo: Record<string, unknown>;
    userEmail?: string;
  }) {
    const id = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.pendingAlerts.unshift({
      id,
      ...report,
      timestamp: new Date().toISOString(),
    });
    if (this.pendingAlerts.length > 50) this.pendingAlerts.pop();
  }

  getPendingAlerts(): PendingAIScanReport[] {
    return [...this.pendingAlerts];
  }

  clearPendingAlerts() {
    this.pendingAlerts = [];
  }

  /** Envia alertas selecionados ao Firebase e remove da lista pendente. */
  async saveSelectedAlertsToFirebase(ids: string[], userEmail?: string): Promise<number> {
    const toSave = this.pendingAlerts.filter(a => ids.includes(a.id));
    let saved = 0;
    try {
      const reportsRef = collection(db, 'admin_ai_scans');
      for (const report of toSave) {
        await addDoc(reportsRef, {
          diagnosis: report.diagnosis,
          score: report.score,
          alert: report.alert,
          health: report.health,
          logs: report.logs,
          systemInfo: report.systemInfo,
          userEmail: userEmail || report.userEmail,
          timestamp: report.timestamp,
        });
        saved++;
      }
      this.pendingAlerts = this.pendingAlerts.filter(a => !ids.includes(a.id));
    } catch (err) {
      console.error('Failed to save selected alerts:', err);
    }
    return saved;
  }

  async saveAIScanReport(report: {
    diagnosis: string;
    score: number;
    alert: boolean;
    health: SystemHealth;
    logs: SystemLog[];
    systemInfo: Record<string, unknown>;
    userEmail?: string;
  }) {
    try {
      const reportsRef = collection(db, 'admin_ai_scans');
      await addDoc(reportsRef, {
        ...report,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save AI scan report:', err);
    }
  }
}

export const healthService = new SystemHealthService();
