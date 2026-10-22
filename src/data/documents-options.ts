/**
 * src/data/documents-options.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ProcessorOption } from '@/types/processor';

/** Opciones compartidas por las conversiones imagen → PDF. */
const IMAGE_TO_PDF: ProcessorOption[] = [
  {
    id: 'pageSize',
    label: 'Tamaño de página',
    type: 'select',
    defaultValue: 'a4',
    choices: [
      { value: 'a4', label: 'A4 (210 × 297 mm)' },
      { value: 'letter', label: 'Carta (8,5 × 11 in)' },
      { value: 'auto', label: 'Automático, igual que la imagen' },
    ],
  },
  {
    id: 'orientation',
    label: 'Orientación',
    type: 'select',
    defaultValue: 'auto',
    choices: [
      { value: 'auto', label: 'Automática según la imagen' },
      { value: 'portrait', label: 'Vertical' },
      { value: 'landscape', label: 'Horizontal' },
    ],
  },
  {
    id: 'marginMm',
    label: 'Margen',
    type: 'select',
    defaultValue: '10',
    choices: [
      { value: '0', label: 'Sin margen (0 mm)' },
      { value: '10', label: 'Estándar (10 mm)' },
      { value: '20', label: 'Amplio (20 mm)' },
    ],
    help: 'El margen se mide en milímetros reales de papel, no en puntos de PDF.',
  },
  {
    id: 'quality',
    label: 'Calidad de las fotos',
    type: 'range',
    defaultValue: 88,
    min: 50,
    max: 100,
    step: 1,
    unit: '%',
    help: 'Solo afecta a las imágenes JPEG. Los PNG conservan su transparencia.',
  },
  {
    id: 'background',
    label: 'Fondo de la página',
    type: 'select',
    defaultValue: '#ffffff',
    choices: [
      { value: '#ffffff', label: 'Blanco' },
      { value: '#f8fafc', label: 'Gris muy claro' },
      { value: '#000000', label: 'Negro' },
    ],
  },
];

/** Opción de rango de páginas, común a PDF → imagen. */
const PAGE_RANGE: ProcessorOption = {
  id: 'pages',
  label: 'Páginas o rangos',
  type: 'text',
  defaultValue: '',
  placeholder: '1-3, 5, 8-10',
  help: 'Si lo dejas vacío se usan todas las páginas. Los números empiezan en 1.',
};

const DPI: ProcessorOption = {
  id: 'dpi',
  label: 'Resolución',
  type: 'select',
  defaultValue: '150',
  choices: [
    { value: '72', label: '72 ppp · pantalla rápida' },
    { value: '150', label: '150 ppp · equilibrada' },
    { value: '300', label: '300 ppp · impresión' },
  ],
  help: 'Más resolución significa imágenes más nítidas y más pesadas.',
};

export const DOCUMENT_OPTIONS = {
  imageToPdf: IMAGE_TO_PDF,
  htmlToPdf: [
    {
      id: 'mode',
      label: 'Cómo generar el PDF',
      type: 'select',
      defaultValue: 'vector',
      choices: [
        {
          value: 'vector',
          label: 'Vectorial y seleccionable (recomendado)',
          description: 'Abre el diálogo de impresión del navegador: elige «Guardar como PDF».',
        },
        {
          value: 'raster',
          label: 'Modo de compatibilidad (descarga directa)',
          description: 'Genera un PDF con la página capturada como imagen. El texto no será seleccionable.',
        },
      ],
      help: 'En el modo vectorial eliges dónde guardarlo en el diálogo de impresión.',
    },
    {
      id: 'pageSize',
      label: 'Tamaño de página',
      type: 'select',
      defaultValue: 'a4',
      choices: [
        { value: 'a4', label: 'A4 (210 × 297 mm)' },
        { value: 'letter', label: 'Carta (8,5 × 11 in)' },
      ],
    },
    {
      id: 'margin',
      label: 'Margen de impresión',
      type: 'select',
      defaultValue: '12mm',
      choices: [
        { value: '0', label: 'Sin margen' },
        { value: '12mm', label: 'Estándar (12 mm)' },
        { value: '20mm', label: 'Amplio (20 mm)' },
      ],
    },
    {
      id: 'scale',
      label: 'Resolución de la captura',
      type: 'select',
      defaultValue: '2',
      choices: [
        { value: '1', label: '1× · rápida' },
        { value: '2', label: '2× · equilibrada' },
        { value: '3', label: '3× · muy nítida' },
      ],
      help: 'Solo afecta al modo de compatibilidad.',
      showWhen: { id: 'mode', equals: 'raster' },
    },
    {
      id: 'quality',
      label: 'Calidad JPEG',
      type: 'range',
      defaultValue: 92,
      min: 50,
      max: 100,
      step: 1,
      unit: '%',
      help: 'Solo afecta al modo de compatibilidad.',
      showWhen: { id: 'mode', equals: 'raster' },
    },
  ] satisfies ProcessorOption[],
  pdfToJpg: [DPI, PAGE_RANGE, {
    id: 'quality',
    label: 'Calidad JPEG',
    type: 'range',
    defaultValue: 90,
    min: 40,
    max: 100,
    step: 1,
    unit: '%',
  }] satisfies ProcessorOption[],
  pdfToPng: [DPI, PAGE_RANGE] satisfies ProcessorOption[],

  wordToPdf: [
    {
      id: 'mode',
      label: 'Cómo generar el PDF',
      type: 'select',
      defaultValue: 'vector',
      choices: [
        {
          value: 'vector',
          label: 'Vectorial y seleccionable (recomendado)',
          description: 'Abre el diálogo de impresión del navegador: elige «Guardar como PDF».',
        },
        {
          value: 'raster',
          label: 'Modo de compatibilidad (descarga directa)',
          description: 'Genera un PDF con la página capturada como imagen. El texto no será seleccionable.',
        },
      ],
      help: 'En el modo vectorial eliges dónde guardarlo en el diálogo de impresión.',
    },
    {
      id: 'pageSize',
      label: 'Tamaño de página',
      type: 'select',
      defaultValue: 'a4',
      choices: [
        { value: 'a4', label: 'A4 (210 × 297 mm)' },
        { value: 'letter', label: 'Carta (8,5 × 11 in)' },
      ],
    },
    {
      id: 'margin',
      label: 'Margen de impresión',
      type: 'select',
      defaultValue: '12mm',
      choices: [
        { value: '0', label: 'Sin margen' },
        { value: '12mm', label: 'Estándar (12 mm)' },
        { value: '20mm', label: 'Amplio (20 mm)' },
      ],
    },
    {
      id: 'scale',
      label: 'Resolución de la captura',
      type: 'select',
      defaultValue: '2',
      choices: [
        { value: '1', label: '1× · rápida' },
        { value: '2', label: '2× · equilibrada' },
        { value: '3', label: '3× · muy nítida' },
      ],
      help: 'Solo afecta al modo de compatibilidad.',
      showWhen: { id: 'mode', equals: 'raster' },
    },
    {
      id: 'quality',
      label: 'Calidad JPEG',
      type: 'range',
      defaultValue: 92,
      min: 50,
      max: 100,
      step: 1,
      unit: '%',
      help: 'Solo afecta al modo de compatibilidad.',
      showWhen: { id: 'mode', equals: 'raster' },
    },
  ] satisfies ProcessorOption[],

  excelToPdf: [
    {
      id: 'orientation',
      label: 'Orientación',
      type: 'select',
      defaultValue: 'auto',
      choices: [
        { value: 'auto', label: 'Automática (apaisado si hay más de 5 columnas)' },
        { value: 'portrait', label: 'Vertical' },
        { value: 'landscape', label: 'Horizontal' },
      ],
    },
  ] satisfies ProcessorOption[],
  pdfToPdfa: [],
};
