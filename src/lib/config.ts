export const API_BASE_URL: string =
  (typeof process !== 'undefined' && process.env?.PUBLIC_API_BASE_URL) || '';

export const API_TIMEOUT_MS = 30_000;
export const ORACLE_URL = 'https://version.v7m.live/api/version';
