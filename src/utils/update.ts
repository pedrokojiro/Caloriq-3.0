export interface AppVersionInfo {
  available: boolean;
  latestVersion?: string;
  latestVersionCode?: number;
  minVersionCode?: number;
  downloadUrl?: string;
  notes?: string;
}

export interface UpdateSnooze { versionCode: number; until: number }

export const SNOOZE_DAYS = 3;

// "required" quando a versão instalada está abaixo da mínima aceita pelo servidor;
// "optional" quando há uma versão mais nova que o usuário não adiou.
export function evaluateUpdate(info: AppVersionInfo | null, currentVersionCode: number | null, snooze: UpdateSnooze | null, now = Date.now()): 'none' | 'optional' | 'required' {
  if (!info?.available || !info.latestVersionCode || !info.downloadUrl || !currentVersionCode) return 'none';
  if (info.minVersionCode && currentVersionCode < info.minVersionCode) return 'required';
  if (currentVersionCode >= info.latestVersionCode) return 'none';
  if (snooze && snooze.versionCode === info.latestVersionCode && snooze.until > now) return 'none';
  return 'optional';
}

export const snoozeFor = (versionCode: number, now = Date.now()): UpdateSnooze => ({ versionCode, until: now + SNOOZE_DAYS * 24 * 60 * 60 * 1000 });
