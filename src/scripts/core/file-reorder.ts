/**
 * src/scripts/core/file-reorder.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Reordenación de la lista de archivos por arrastre.
 *
 * Usa eventos de puntero, así que funciona igual con ratón que con el dedo.
 * El asa es un botón real: con el teclado se reordena con las flechas ↑ y ↓.
 *
 * Al soltar o mover se emite `convertilocal:reorder-files` con
 * `{ from, to }`, que es el evento que ya consume el procesador para
 * reordenar `state.files` y volver a pintar la lista.
 */
export function initFileReorder(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>('[data-fp-file-list]');
  if (!list) return;

  let active = false;
  let index = -1;

  const end = (): void => {
    if (!active) return;
    active = false;
    index = -1;
    document.body.style.userSelect = '';
    list.removeAttribute('data-reordering');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
  };

  const move = (from: number, to: number): void => {
    if (from === to) return;
    root.dispatchEvent(
      new CustomEvent('convertilocal:reorder-files', {
        bubbles: true,
        detail: { from, to },
      }),
    );
  };

  const onMove = (event: PointerEvent): void => {
    if (!active) return;
    event.preventDefault();

    const items = [...list.querySelectorAll<HTMLElement>('[data-fp-file-item]')];
    if (items.length === 0) return;

    let target = items.length - 1;
    for (const [position, item] of items.entries()) {
      const rect = item.getBoundingClientRect();
      if (event.clientY < rect.top) {
        target = 0;
        break;
      }
      if (event.clientY <= rect.bottom) {
        target = position;
        break;
      }
    }

    if (target === index) return;

    const from = index;
    move(from, target);
    index = target;
  };

  list.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    const handle = target?.closest<HTMLElement>('[data-fp-reorder-handle]');
    if (!handle) return;

    const position = Number(handle.dataset.fpReorderIndex);
    if (!Number.isInteger(position) || position < 0) return;

    event.preventDefault();
    active = true;
    index = position;
    document.body.style.userSelect = 'none';
    list.setAttribute('data-reordering', 'true');
    handle.setAttribute('aria-grabbed', 'true');

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  });

  // Teclado: el asa es un botón, así que con las flechas se reordena.
  list.addEventListener('keydown', (event) => {
    const target = event.target as Element | null;
    const handle = target?.closest<HTMLElement>('[data-fp-reorder-handle]');
    if (!handle) return;

    const position = Number(handle.dataset.fpReorderIndex);
    if (!Number.isInteger(position) || position < 0) return;

    if (event.key === 'ArrowUp' && position > 0) {
      event.preventDefault();
      move(position, position - 1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(position, position + 1);
    }
  });
}
