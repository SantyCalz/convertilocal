/// <reference types="astro/client" />

declare module '*.wasm?url' {
  const url: string;
  export default url;
}

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_ADSENSE_CLIENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  adsbygoogle?: Record<string, unknown>[];
}
