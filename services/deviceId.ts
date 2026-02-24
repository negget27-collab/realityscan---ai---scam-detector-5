const STORAGE_KEY = 'rs_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rs_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}
