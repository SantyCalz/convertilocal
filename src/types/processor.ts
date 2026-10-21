/**
 * Contrato único de procesador (ConvertiLocal).
 *
 * Todo procesador se ejecuta en el navegador. La firma `run` es estable para
 * que las herramientas de la Fase 1 puedan cargarse de forma diferida sin
 * cambiar la UI.
 */

export type ProcessorOutput = Blob | File;

export interface ProcessorOptions {
  [key: string]: unknown;
}

export type ProcessorOptionType = 'select' | 'range' | 'checkbox' | 'text' | 'number';

export interface ProcessorOptionChoice {
  value: string;
  label: string;
  description?: string;
}

export interface ProcessorOption {
  id: string;
  label: string;
  type: ProcessorOptionType;
  defaultValue: string | number | boolean;
  choices?: ProcessorOptionChoice[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
  /** Unidad visible junto al valor (%, KB, px…). */
  unit?: string;
  /** Solo se muestra cuando otra opción tiene el valor indicado. */
  showWhen?: {
    id: string;
    equals: string | number | boolean;
  };
}

export interface Processor {
  id: string;
  /** Nombre legible, útil para la barra de estado y el registro de recientes. */
  name?: string;
  /** Mime-types o extensiones aceptadas, p. ej. `image/png` o `.pdf`. */
  accepts: string[];
  /** Opciones que la UI puede renderizar automáticamente. */
  options?: ProcessorOption[];
  run(
    files: File[],
    options: ProcessorOptions,
    onProgress?: (percent: number) => void,
  ): Promise<ProcessorOutput[]>;
}

export type FormatCategory =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'archive'
  | 'data'
  | 'other';

export interface FormatInfo {
  id: string;
  name: string;
  extension: string;
  mimeTypes: string[];
  category: FormatCategory;
  /** Soporte previsto en el navegador para leer/escribir el formato. */
  browserSupport?: 'native' | 'wasm' | 'partial' | 'none';
  notes?: string;
}

export interface ConversionInfo {
  id: string;
  title: string;
  description: string;
  /** Ids de `FormatInfo` de origen y destino. */
  from: string[];
  to: string[];
  processorId: string;
  lossy?: boolean;
  maxSizeMB?: number;
  notes?: string;
}

/** Resultado normalizado de `Processor.run()` para la capa de descarga. */
export interface ProcessorResult {
  files: ProcessorOutput[];
  processorId: string;
  durationMs: number;
}
