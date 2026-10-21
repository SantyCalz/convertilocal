/**
 * Filtra la grilla de herramientas por categoría.
 * Las tarjetas de categoría y las píldoras de filtro comparten
 * `data-category-filter`; ambas actualizan su `aria-pressed`.
 */
/**
 * src/scripts/home/filters.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export function initToolFilters(): void {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-category-filter]'),
  );
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-tool-card]'));
  const count = document.querySelector<HTMLElement>('[data-tool-count]');

  if (buttons.length === 0 || cards.length === 0) return;

  const apply = (filter: string, scroll: boolean): void => {
    buttons.forEach((button) => {
      const active = (button.dataset.categoryFilter ?? 'todos') === filter;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    let visible = 0;
    cards.forEach((card) => {
      const show = filter === 'todos' || card.dataset.category === filter;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (count) {
      count.textContent = `${visible} ${visible === 1 ? 'herramienta' : 'herramientas'}`;
    }

    if (scroll) {
      document.getElementById('herramientas')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      apply(button.dataset.categoryFilter ?? 'todos', Boolean(button.closest('#categorias')));
    });
  });

  apply('todos', false);
}
