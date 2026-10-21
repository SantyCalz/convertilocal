# AGENTS.md — Contexto Permanente & Especificación Técnica: ConvertiLocal

## 1. VISIÓN DEL PRODUCTO
ConvertiLocal es una suite de micro-herramientas de conversión y manipulación de archivos que funciona 100% Client-Side en el navegador del usuario.
- Promesa central: **"Tus archivos nunca salen de tu dispositivo"** + **"Funciona en modo avión"**.
- Modelo de negocio: Tráfico orgánico (Long-tail SEO) monetizado con Google AdSense no invasivo.

---

## 2. STACK TÉCNICO & ARQUITECTURA
- **Framework:** Astro (SSG/Estático) + Tailwind CSS + TypeScript Vanilla.
- **Procesamiento:** 100% Client-Side usando Web Workers, OffscreenCanvas, Web Audio API, `File.stream()`, y librerías compiladas a WASM o JS nativo.
- **Contrato Único de Procesador:**
  ```typescript
  export interface ProcessorOptions {
    [key: string]: any;
  }

  export interface Processor {
    id: string;
    accepts: string[]; // Mime-types o extensiones
    run(
      files: File[], 
      options: ProcessorOptions, 
      onProgress?: (percent: number) => void
    ): Promise<Blob[] File[] |>;
  }