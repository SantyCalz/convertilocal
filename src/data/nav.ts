/**
 * src/data/nav.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export const MAIN_NAV = [
  { href: '/convertir', label: 'Imágenes' },
  { href: '/pdf', label: 'PDF' },
  { href: '/convertir/datos', label: 'Datos' },
  { href: '/texto', label: 'Texto' },
  { href: '/media', label: 'Media' },
  { href: '/#herramientas', label: 'Herramientas' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/metodologia', label: 'Metodología' },
] as const;

export const FOOTER_PROJECT_LINKS = [
  { href: '/sobre-nosotros', label: 'Sobre el proyecto' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/contacto', label: 'Contacto' },
] as const;

export const FOOTER_TOOL_LINKS = [
  { href: '/convertir', label: 'Convertir imágenes' },
  { href: '/pdf', label: 'Herramientas PDF' },
  { href: '/pdf/unir-pdf', label: 'Unir PDF' },
  { href: '/pdf/comprimir-pdf', label: 'Comprimir PDF' },
  { href: '/imagenes/reducir-foto-a-kb', label: 'Reducir foto a KB' },
  { href: '/imagenes/quitar-exif-foto', label: 'Quitar EXIF' },
  { href: '/imagenes/eliminar-fondo', label: 'Eliminar fondo' },
  { href: '/imagenes/redimensionar', label: 'Redimensionar' },
  { href: '/imagenes/recortar', label: 'Recortar' },
  { href: '/#herramientas', label: 'Todas las herramientas' },
] as const;
