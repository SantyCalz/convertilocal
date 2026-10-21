import type { ProcessorOption } from '@/types/processor';

export const DATA_OPTIONS = {
  csvToJson: [
    {
      id: 'delimiter',
      label: 'Delimitador',
      type: 'select',
      defaultValue: 'auto',
      choices: [
        { value: 'auto', label: 'Detectar automáticamente' },
        { value: ',', label: 'Coma (,)' },
        { value: 'semicolon', label: 'Punto y coma (;)' },
        { value: 'tab', label: 'Tabulador' },
        { value: 'pipe', label: 'Barra vertical (|)' },
      ],
    },
    {
      id: 'header',
      label: 'La primera fila es cabecera',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  jsonToCsv: [
    {
      id: 'delimiter',
      label: 'Delimitador',
      type: 'select',
      defaultValue: 'comma',
      choices: [
        { value: 'comma', label: 'Coma (,)' },
        { value: 'semicolon', label: 'Punto y coma (;)' },
        { value: 'tab', label: 'Tabulador' },
        { value: 'pipe', label: 'Barra vertical (|)' },
      ],
    },
    {
      id: 'header',
      label: 'Incluir cabecera',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  jsonToXlsx: [
    {
      id: 'header',
      label: 'Incluir cabecera',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  xlsxToJson: [
    {
      id: 'sheet',
      label: 'Hoja a leer',
      type: 'text',
      defaultValue: '',
      placeholder: '1 o NombreDeHoja',
      help: 'Deja vacío para usar la primera hoja.',
    },
    {
      id: 'header',
      label: 'La primera fila es cabecera',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  csvToXlsx: [
    {
      id: 'delimiter',
      label: 'Delimitador',
      type: 'select',
      defaultValue: 'auto',
      choices: [
        { value: 'auto', label: 'Detectar automáticamente' },
        { value: ',', label: 'Coma (,)' },
        { value: 'semicolon', label: 'Punto y coma (;)' },
        { value: 'tab', label: 'Tabulador' },
        { value: 'pipe', label: 'Barra vertical (|)' },
      ],
    },
    {
      id: 'header',
      label: 'La primera fila es cabecera',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  xlsxToCsv: [
    {
      id: 'sheet',
      label: 'Hoja a leer',
      type: 'text',
      defaultValue: '',
      placeholder: '1 o NombreDeHoja',
      help: 'Deja vacío para usar la primera hoja.',
    },
    {
      id: 'delimiter',
      label: 'Delimitador de salida',
      type: 'select',
      defaultValue: 'comma',
      choices: [
        { value: 'comma', label: 'Coma (,)' },
        { value: 'semicolon', label: 'Punto y coma (;)' },
        { value: 'tab', label: 'Tabulador' },
        { value: 'pipe', label: 'Barra vertical (|)' },
      ],
    },
    {
      id: 'header',
      label: 'Incluir cabecera',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  jsonToYaml: [
    {
      id: 'pretty',
      label: 'Salida legible',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  yamlToJson: [
    {
      id: 'pretty',
      label: 'JSON con indentación',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  jsonToXml: [
    {
      id: 'rootKey',
      label: 'Etiqueta raíz',
      type: 'text',
      defaultValue: 'root',
      placeholder: 'root',
      help: 'Se usa como elemento raíz del XML.',
    },
    {
      id: 'pretty',
      label: 'Salida legible',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  xmlToJson: [
    {
      id: 'pretty',
      label: 'JSON con indentación',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  markdownToHtml: [
    {
      id: 'gfm',
      label: 'GitHub Flavored Markdown',
      type: 'checkbox',
      defaultValue: true,
      help: 'Activa tablas, listas de tareas y otros elementos extendidos.',
    },
    {
      id: 'sanitize',
      label: 'Sanitizar HTML',
      type: 'checkbox',
      defaultValue: true,
      help: 'Recomendado para reducir riesgos de XSS.',
    },
  ] satisfies ProcessorOption[],

  htmlToMarkdown: [
    {
      id: 'sanitize',
      label: 'Limpiar HTML antes de convertir',
      type: 'checkbox',
      defaultValue: true,
    },
  ] satisfies ProcessorOption[],

  textCleaner: [
    {
      id: 'removeExtraBreaks',
      label: 'Eliminar saltos de línea extra',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      id: 'collapseSpaces',
      label: 'Unificar espacios dobles',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      id: 'trimLines',
      label: 'Recortar espacios al inicio y final de cada línea',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      id: 'removeEmptyLines',
      label: 'Eliminar líneas vacías',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      id: 'caseTransform',
      label: 'Transformar mayúsculas/minúsculas',
      type: 'select',
      defaultValue: 'none',
      choices: [
        { value: 'none', label: 'Sin cambios' },
        { value: 'lower', label: 'minúsculas' },
        { value: 'upper', label: 'MAYÚSCULAS' },
        { value: 'title', label: 'Tipo Título' },
        { value: 'sentence', label: 'Tipo frase' },
      ],
    },
    {
      id: 'includeStats',
      label: 'Añadir estadísticas al final del archivo',
      type: 'checkbox',
      defaultValue: false,
    },
  ] satisfies ProcessorOption[],
};
