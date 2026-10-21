import { PUBLIC_TOOLS } from '@/data/tools';
import type { Tool } from '@/types/tool';

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const INDEX = PUBLIC_TOOLS.map((tool) => ({
  tool,
  haystack: normalize(
    [tool.name, tool.description, tool.category, ...tool.keywords].join(' '),
  ),
}));

function searchTools(query: string): Tool[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return INDEX.filter(({ haystack }) => terms.every((term) => haystack.includes(term)))
    .map(({ tool }) => tool)
    .slice(0, 6);
}

export function initToolSearch(): void {
  const root = document.querySelector<HTMLElement>('[data-tool-search]');
  const input = root?.querySelector<HTMLInputElement>('[data-tool-search-input]');
  const panel = root?.querySelector<HTMLElement>('[data-tool-search-results]');
  if (!root || !input || !panel) return;

  let results: Tool[] = [];
  let options: HTMLElement[] = [];
  let activeIndex = -1;

  const closePanel = (): void => {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };

  const setActive = (index: number): void => {
    if (options.length === 0) return;

    const next = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      const active = optionIndex === next;
      option.setAttribute('aria-selected', active ? 'true' : 'false');
      option.classList.toggle('bg-slate-50', active);
      option.classList.toggle('ring-1', active);
      option.classList.toggle('ring-inset', active);
      option.classList.toggle('ring-slate-200', active);
    });

    activeIndex = next;
    const activeOption = options[next];
    if (activeOption) {
      input.setAttribute('aria-activedescendant', activeOption.id);
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  };

  const highlightCard = (tool: Tool): void => {
    const card = Array.from(document.querySelectorAll<HTMLElement>('[data-tool-card]')).find(
      (element) => element.dataset.toolId === tool.id,
    );
    if (!card) return;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2');
    window.setTimeout(() => {
      card.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2');
    }, 1800);
  };

  const activate = (tool: Tool): void => {
    closePanel();

    if (tool.href) {
      window.location.assign(tool.href);
      return;
    }

    const allFilter = document.querySelector<HTMLButtonElement>(
      '[data-category-filter="todos"]',
    );
    if (allFilter && allFilter.getAttribute('aria-pressed') !== 'true') {
      allFilter.click();
    }

    highlightCard(tool);
  };

  const buildOption = (tool: Tool, index: number): HTMLElement => {
    const option = document.createElement('div');
    option.id = `tool-search-option-${index}`;
    option.dataset.index = String(index);
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.className =
      'flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-slate-50';

    const badge = document.createElement('span');
    badge.className =
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = tool.name.slice(0, 2).toUpperCase();

    const body = document.createElement('div');
    body.className = 'min-w-0 flex-1';

    const title = document.createElement('p');
    title.className = 'text-sm font-medium text-slate-900';
    title.textContent = tool.name;

    const description = document.createElement('p');
    description.className = 'mt-0.5 line-clamp-1 text-xs text-slate-500';
    description.textContent = tool.description;

    body.append(title, description);

    const side = document.createElement('span');
    side.className = tool.href
      ? 'shrink-0 pt-1 text-[10px] font-semibold text-brand-700'
      : 'shrink-0 pt-1 text-[10px] font-medium text-slate-400';
    side.textContent = tool.href ? 'Abrir' : 'Próximamente';

    option.append(badge, body, side);
    option.addEventListener('mouseenter', () => setActive(index));
    option.addEventListener('click', () => activate(tool));

    return option;
  };

  const render = (): void => {
    const query = input.value;
    results = searchTools(query);
    options = [];
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    panel.replaceChildren();

    if (!query.trim()) {
      closePanel();
      return;
    }

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'px-3 py-4 text-center';
      empty.innerHTML =
        '<p class="text-sm font-medium text-slate-700">Sin resultados</p><p class="mt-1 text-xs text-slate-500">Prueba con «imagen», «audio», «PDF» o «CSV».</p>';
      panel.append(empty);
    } else {
      results.forEach((tool, index) => {
        const option = buildOption(tool, index);
        options.push(option);
        panel.append(option);
      });
    }

    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', () => {
    if (input.value.trim()) render();
  });

  input.addEventListener('keydown', (event) => {
    if (panel.hidden) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive(Math.min(activeIndex + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
        break;
      case 'Enter': {
        const target = results[activeIndex] ?? results[0];
        if (target) {
          event.preventDefault();
          activate(target);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        closePanel();
        input.blur();
        break;
      default:
        break;
    }
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target as Node)) closePanel();
  });
}
