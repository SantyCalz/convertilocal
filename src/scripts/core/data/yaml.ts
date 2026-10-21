import * as yaml from 'js-yaml';

export function parseYaml(text: string): unknown {
  return yaml.load(text);
}

export function stringifyYaml(value: unknown, pretty = true): string {
  return yaml.dump(value, {
    indent: pretty ? 2 : 1,
    lineWidth: pretty ? 120 : -1,
    noRefs: true,
  });
}
