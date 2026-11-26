/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the auth API, set at static-site build time. Unset keeps the local demo code. */
  readonly VITE_AUTH_API_BASE?: string;
}
