/** API origin: same-origin /api on the VPS; the Vercel build sets VITE_NAKAMA_API to the hosted server's /api (it answers CORS *). */
export const API_BASE: string = import.meta.env.VITE_NAKAMA_API ?? '/api';

/** The Android build, served by the VPS nginx (absolute, so the Vercel copy links to the same file). */
export const APK_URL = 'https://nakama.201-18-198-162.sslip.io/download/nakama.apk';
