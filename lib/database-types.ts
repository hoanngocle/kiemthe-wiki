// Shared by the browser and server; keep Node-only backup code out of this file.
export const DATABASES = ["91jx_gamecenter", "91jx_goddess", "91jx_statlog", "global_logserver", "jxaccount"] as const;
export const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
export type DatabaseName = typeof DATABASES[number];
