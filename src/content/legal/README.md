# Textos legales

Este directorio contiene los textos legales del sitio, aislados de las
plantillas para poder revisarlos y auditarlos por separado.

- `types.ts` — forma de los documentos legales.
- `privacidad.ts` — política de privacidad (`/privacidad`).
- `terminos.ts` — términos de uso (`/terminos`).
- `licencias.ts` — licencias y atribuciones (`/licencias`).
- `third-party.json` — inventario de dependencias de terceros. **Generado** por
  `scripts/generate-third-party.mjs`; no editar a mano.

Las páginas que los renderizan son `src/pages/privacidad.astro`,
`src/pages/terminos.astro` y `src/pages/licencias.astro`, mediante el
componente `src/components/legal/LegalDocument.astro`.
