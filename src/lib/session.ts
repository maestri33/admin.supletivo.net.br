/**
 * Client-side session and auth token manager for admin.supletivo.net.br.
 * Uses localStorage with safe fallback for SSR.
 */

const ADMIN_LOGIN_KEY = 'supletivo.admin.login';
const ADMIN_CHECK_KEY = 'supletivo.admin.check';

let memoryRefreshToken: string | null = null;

export interface StaffLoginPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: {
    external_id: string;
    name?: string | null;
    cpf?: string | null;
    phone?: string | null;
    is_superuser?: boolean;
    is_staff?: boolean;
  };
}

export interface StaffCheckPayload {
  found: boolean;
  external_id: string | null;
  otp_sent: boolean;
  otp_wait: number | null;
  masked_email?: string | null;
  channels_sent?: string[] | null;
  whatsapp?: boolean | null;
  channel?: string | null;
  identifier?: string;
}

export function saveStaffCheck(payload: StaffCheckPayload): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_CHECK_KEY, JSON.stringify(payload));
}

export function getStaffCheck(): StaffCheckPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_CHECK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffCheckPayload;
  } catch {
    return null;
  }
}

export function clearStaffCheck(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_CHECK_KEY);
}

export function saveStaffLogin(payload: StaffLoginPayload): void {
  if (typeof window === 'undefined') return;
  if (payload.refresh_token) {
    memoryRefreshToken = payload.refresh_token;
  }
  window.localStorage.setItem(ADMIN_LOGIN_KEY, JSON.stringify(payload));
  try {
    const secureFlag = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `supletivo.admin.session=${encodeURIComponent(payload.access_token)}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
  } catch {}
}

export const setStaffLogin = saveStaffLogin;

export function getStaffLogin(): StaffLoginPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_LOGIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffLoginPayload;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  const login = getStaffLogin();
  return login?.access_token || null;
}

export function getRefreshToken(): string | null {
  if (memoryRefreshToken) return memoryRefreshToken;
  const login = getStaffLogin();
  if (login?.refresh_token) {
    memoryRefreshToken = login.refresh_token;
    return login.refresh_token;
  }
  return null;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  memoryRefreshToken = null;
  window.localStorage.removeItem(ADMIN_LOGIN_KEY);
  window.localStorage.removeItem(ADMIN_CHECK_KEY);
  try {
    const secureFlag = typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `supletivo.admin.session=;path=/;max-age=0;SameSite=Lax${secureFlag}`;
  } catch {}
}
