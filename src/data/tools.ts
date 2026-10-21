import type { Tool } from '@/types/tool';
import cardsData from '@/data/conversion-cards.json';
import { PDF_TOOLS } from '@/data/pdf-tools';
import { DATA_TOOLS, TEXT_TOOL_SLUGS } from '@/data/data-tools';
import { MEDIA_TOOLS, MEDIA_SLUGS } from '@/data/media-tools';

interface ConversionCard {
  id: string;
  name: string;
  description: string;
  accepts: string[];
  outputs: string[];
  keywords: string[];
  href: string;
}

const conversionTools: Tool[] = (cardsData as ConversionCard[]).map((card) => ({
  ...card,
  category: 'imagen',
  status: 'stable',
  icon: 'image',
}));

const imageTools: Tool[] = [
  ...conversionTools,
  {
    id: 'reducir-foto-a-kb',
    name: 'Reducir foto a KB',
    description: 'Ajusta una foto a un peso concreto en KB o elige la calidad manualmente.',
    category: 'imagen',
    accepts: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.ico'],
    outputs: ['.jpg', '.webp', '.avif'],
    status: 'stable',
    icon: 'zap',
    keywords: ['reducir foto', 'comprimir imagen', 'peso kb', 'optimizar', 'calidad'],
    href: '/imagenes/reducir-foto-a-kb',
  },
  {
    id: 'quitar-exif-foto',
    name: 'Quitar EXIF de una foto',
    description: 'Elimina GPS, fecha, cámara y otros metadatos de JPG, PNG y WebP sin recomprimir.',
    category: 'imagen',
    accepts: ['.jpg', '.jpeg', '.png', '.webp'],
    outputs: ['.jpg', '.png', '.webp'],
    status: 'stable',
    icon: 'shield',
    keywords: ['quitar exif', 'eliminar gps', 'metadatos foto', 'privacidad', 'limpiar imagen'],
    href: '/imagenes/quitar-exif-foto',
  },
];

const documentTools: Tool[] = PDF_TOOLS.map((tool) => {
  const isImageInput = tool.slug === 'imagen-a-pdf';
  const isImageOutput = tool.slug === 'pdf-a-jpg' || tool.slug === 'pdf-a-png';

  return {
    id: tool.slug,
    name: tool.h1,
    description: tool.description,
    category: 'documentos',
    accepts: isImageInput
      ? ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.gif']
      : ['.pdf'],
    outputs: isImageInput
      ? ['.pdf']
      : isImageOutput
        ? [tool.slug === 'pdf-a-jpg' ? '.jpg' : '.png']
        : ['.pdf'],
    status: 'stable',
    icon: 'file-text',
    keywords: tool.keywords,
    href: `/pdf/${tool.slug}`,
  } satisfies Tool;
});

const dataTools: Tool[] = DATA_TOOLS.filter((tool) => !TEXT_TOOL_SLUGS.has(tool.slug)).map((tool) => ({
  id: tool.slug,
  name: tool.h1,
  description: tool.description,
  category: 'datos',
  accepts: tool.accept.split(',').map((item) => item.trim()),
  outputs: [tool.fixedOptions?.to ? `.${tool.fixedOptions.to}` : '.txt'],
  status: 'stable',
  icon: 'table',
  keywords: tool.keywords,
  href: `/convertir/${tool.slug}`,
}));

const textTools: Tool[] = DATA_TOOLS.filter((tool) => TEXT_TOOL_SLUGS.has(tool.slug)).map((tool) => ({
  id: tool.slug,
  name: tool.h1,
  description: tool.description,
  category: 'texto',
  accepts: tool.accept.split(',').map((item) => item.trim()),
  outputs: [tool.slug === 'limpiar-texto' ? '.txt' : tool.slug === 'markdown-a-html' ? '.html' : '.md'],
  status: 'stable',
  icon: 'clipboard',
  keywords: tool.keywords,
  href: tool.slug === 'limpiar-texto' || tool.slug === 'markdown-a-html' || tool.slug === 'html-a-markdown'
    ? `/texto/${tool.slug}`
    : `/convertir/${tool.slug}`,
}));

const mediaTools: Tool[] = MEDIA_TOOLS.map((tool) => ({
  id: tool.slug,
  name: tool.h1,
  description: tool.description,
  category: tool.accept.includes('video') ? 'video' : 'audio',
  accepts: tool.accept.split(',').map((item) => item.trim()),
  outputs: [tool.slug === 'mp4-a-gif' ? '.gif' : tool.slug === 'comprimir-video' ? '.mp4' : tool.slug.startsWith('mp4-a-') || tool.slug.startsWith('webm-a-') ? '.mp3' : tool.slug === 'mp4-a-wav' ? '.wav' : tool.fixedOptions?.format ? `.${tool.fixedOptions.format}` : '.mp3'],
  status: 'stable',
  icon: tool.accept.includes('video') ? 'video' : 'music',
  keywords: tool.keywords,
  href: MEDIA_SLUGS.has(tool.slug) ? `/media/${tool.slug}` : `/convertir/${tool.slug}`,
}));

const imagePhaseTools: Tool[] = [
  {
    id: 'eliminar-fondo',
    name: 'Eliminar fondo de imagen',
    description: 'Quita el fondo de una imagen y descarga un PNG transparente, sin subir archivos.',
    category: 'imagen',
    accepts: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.ico'],
    outputs: ['.png', '.webp'],
    status: 'stable',
    icon: 'image',
    keywords: ['eliminar fondo', 'quitar fondo', 'fondo transparente', 'remove background', 'png transparente'],
    href: '/imagenes/eliminar-fondo',
  },
  {
    id: 'redimensionar',
    name: 'Redimensionar imagen',
    description: 'Cambia el tamaño de una imagen con ancho, alto y ajuste configurable.',
    category: 'imagen',
    accepts: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.ico'],
    outputs: ['.png', '.jpg', '.webp', '.avif', '.bmp', '.ico'],
    status: 'stable',
    icon: 'image',
    keywords: ['redimensionar', 'cambiar tamaño', 'resize imagen', 'escalar imagen', 'dimensiones'],
    href: '/imagenes/redimensionar',
  },
  {
    id: 'recortar',
    name: 'Recortar imagen',
    description: 'Recorta una imagen con coordenadas exactas, sin subir archivos.',
    category: 'imagen',
    accepts: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.ico'],
    outputs: ['.png', '.jpg', '.webp', '.avif', '.bmp', '.ico'],
    status: 'stable',
    icon: 'image',
    keywords: ['recortar', 'crop imagen', 'recorte', 'coordenadas', 'imagen'],
    href: '/imagenes/recortar',
  },
];

const plannedTools: Tool[] = [
  {
    id: 'pdf-a-texto',
    name: 'PDF a texto',
    description: 'Extrae el texto de un PDF, incluso si tiene varias páginas.',
    category: 'documentos',
    accepts: ['.pdf'],
    outputs: ['.txt'],
    status: 'planned',
    icon: 'file-text',
    keywords: ['pdf', 'texto', 'extraer', 'ocr', 'documento'],
  },
  {
    id: 'comprimir-zip',
    name: 'Comprimir ZIP',
    description: 'Empaqueta varios archivos en un ZIP sin límites de subida.',
    category: 'archivos',
    accepts: ['*'],
    outputs: ['.zip'],
    status: 'planned',
    icon: 'archive',
    keywords: ['zip', 'comprimir', 'archivos', 'empaquetar'],
  },
];

export const TOOLS: Tool[] = [
  ...imageTools,
  ...imagePhaseTools,
  ...documentTools,
  ...dataTools,
  ...textTools,
  ...mediaTools,
  ...plannedTools,
  {
    id: 'file-processor-demo',
    name: 'Laboratorio FileProcessor',
    description: 'Página de pruebas del componente base: arrastre, pegado y descarga.',
    category: 'archivos',
    accepts: ['image/*'],
    outputs: ['image/*'],
    status: 'beta',
    icon: 'sparkles',
    keywords: ['demo', 'laboratorio', 'qa', 'procesador'],
    href: '/demo-file-processor',
    hidden: true,
  },
];

export const PUBLIC_TOOLS = TOOLS.filter((tool) => !tool.hidden);
export const AVAILABLE_TOOLS = PUBLIC_TOOLS.filter((tool) => tool.status === 'stable');

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

export function countToolsByCategory(categoryId: string): number {
  return PUBLIC_TOOLS.filter((tool) => tool.category === categoryId).length;
}
