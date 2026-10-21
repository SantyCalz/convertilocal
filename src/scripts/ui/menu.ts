export function initMobileMenu(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-mobile-menu]');
  if (!dialog) return;

  const open = (): void => {
    if (dialog.open) return;
    dialog.showModal();
    document.documentElement.classList.add('overflow-hidden');
  };

  const close = (): void => {
    if (dialog.open) dialog.close();
  };

  document.querySelectorAll('[data-menu-open]').forEach((trigger) => {
    trigger.addEventListener('click', open);
  });

  dialog.querySelectorAll('[data-menu-close]').forEach((trigger) => {
    trigger.addEventListener('click', close);
  });

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('overflow-hidden');
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
}
