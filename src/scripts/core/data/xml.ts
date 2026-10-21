function isElementNode(node: Node): node is Element {
  return node.nodeType === 1;
}

function textOf(node: Element): string {
  let text = '';
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 || child.nodeType === 4) {
      text += child.nodeValue ?? '';
    }
  }
  return text.trim();
}

export function parseXml(text: string): unknown {
  const document = new DOMParser().parseFromString(text, 'application/xml');
  const error = document.querySelector('parsererror');
  if (error) {
    throw new Error('El XML no es válido o está mal formado.');
  }

  if (!document.documentElement) {
    throw new Error('El XML no contiene un elemento raíz.');
  }

  return elementToJson(document.documentElement);
}

function elementToJson(element: Element): unknown {
  const result: Record<string, unknown> = {};

  for (const attribute of Array.from(element.attributes)) {
    result[`@${attribute.name}`] = attribute.value;
  }

  const children = Array.from(element.childNodes).filter(isElementNode);
  const text = textOf(element);

  if (children.length === 0) {
    if (Object.keys(result).length === 0) return text;
    if (text) result['#text'] = text;
    return result;
  }

  const grouped = new Map<string, unknown[]>();
  for (const child of children) {
    const value = elementToJson(child);
    const list = grouped.get(child.tagName) ?? [];
    list.push(value);
    grouped.set(child.tagName, list);
  }

  for (const [name, values] of grouped) {
    result[name] = values.length === 1 ? values[0] : values;
  }

  if (text) result['#text'] = text;
  return result;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stringifyXml(value: unknown, rootName = 'root'): string {
  const body = valueToXml(value, rootName, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

function valueToXml(value: unknown, tagName: string, depth: number): string {
  const indent = '  '.repeat(depth);

  if (value === null || value === undefined) {
    return `${indent}<${tagName} />`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => valueToXml(item, tagName, depth)).join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const attributes: string[] = [];
    const children: string[] = [];
    let text = '';

    for (const [key, childValue] of entries) {
      if (key.startsWith('@')) {
        attributes.push(`${key.slice(1)}="${escapeXml(String(childValue ?? ''))}"`);
      } else if (key === '#text') {
        text = String(childValue ?? '');
      } else {
        children.push(valueToXml(childValue, key, depth + 1));
      }
    }

    const attributeText = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
    if (children.length === 0) {
      return `${indent}<${tagName}${attributeText}>${escapeXml(text)}</${tagName}>`;
    }
    return `${indent}<${tagName}${attributeText}>\n${children.join('\n')}\n${indent}</${tagName}>`;
  }

  return `${indent}<${tagName}>${escapeXml(String(value))}</${tagName}>`;
}
