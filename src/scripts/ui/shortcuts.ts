function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

function focusSearch(): boolean {
  const input = document.querySelector<HTMLInputElement>('[data-tool-search-input]');
  if (!input) return false;

  document.getElementById('buscador')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  input.focus({ preventScroll: true });
  input.select();
  return true;
}

/**
 * Atajo global `/` (y Ctrl/Cmd+K) para llegar al buscador.
 * En páginas sin buscador, el enlace navega a `/#buscador`.
 */
export function initShortcuts(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-search-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (focusSearch()) event.preventDefault();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey) return;

    const key = event.key.toLowerCase();

    if ((event.metaKey || event.ctrlKey) && key === 'k') {
      if (focusSearch()) event.preventDefault();
      return;
    }

    if (event.metaKey || event.ctrlKey) return;

    if (key === '/' && !isEditable(event.target)) {
      if (focusSearch()) event.preventDefault();
      else window.location.href = '/#buscador';
    }
  });
}
