/**
 * src/scripts/home/recent.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getToolById } from '@/data/tools';
import type { RecentToolEntry, Tool } from '@/types/tool';

const STORAGE_KEY = 'convertilocal:recent-tools:v1';
const MAX_RECENT = 4;

function readEntries(): RecentToolEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is RecentToolEntry => {
      if (typeof entry !== 'object' || entry === null) return false;
      const candidate = entry as Partial<RecentToolEntry>;
      return typeof candidate.id === 'string' && typeof candidate.usedAt === 'number';
    });
  } catch {
    return [];
  }
}

export function recordToolUse(id: string): void {
  if (!getToolById(id)) return;

  try {
    const next: RecentToolEntry[] = [
      { id, usedAt: Date.now() },
      ...readEntries().filter((entry) => entry.id !== id),
    ].slice(0, MAX_RECENT);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage puede estar bloqueado (modo privado, permisos).
  }
}

function formatUsedAt(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

export function initRecentTools(): void {
  const container = document.querySelector<HTMLElement>('[data-recent-tools]');
  if (!container) return;

  const emptyState = container.querySelector('[data-recent-empty]')?.cloneNode(true) ?? null;

  const entries = readEntries()
    .map((entry) => ({ entry, tool: getToolById(entry.id) }))
    .filter(
      (item): item is { entry: RecentToolEntry; tool: Tool } => item.tool !== undefined,
    )
    .slice(0, MAX_RECENT);

  if (entries.length === 0) return;

  const grid = document.createElement('div');
  grid.className = 'grid gap-3 sm:grid-cols-2';

  entries.forEach(({ entry, tool }) => {
    const card = document.createElement(tool.href ? 'a' : 'div');
    card.className =
      'group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40';

    if (card instanceof HTMLAnchorElement && tool.href) {
      card.href = tool.href;
    }

    const badge = document.createElement('span');
    badge.className =
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-brand-700 shadow-sm ring-1 ring-slate-200';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = tool.name.slice(0, 2).toUpperCase();

    const body = document.createElement('div');
    body.className = 'min-w-0 flex-1';

    const title = document.createElement('p');
    title.className = 'truncate text-sm font-semibold text-slate-900';
    title.textContent = tool.name;

    const description = document.createElement('p');
    description.className = 'mt-0.5 line-clamp-1 text-xs text-slate-500';
    description.textContent = tool.description;

    const meta = document.createElement('p');
    meta.className = 'mt-1.5 flex items-center gap-1 text-[10px] text-slate-400';
    meta.textContent = `Usada el ${formatUsedAt(entry.usedAt)} · `;
    const status = document.createElement('span');
    status.className = tool.href ? 'font-semibold text-brand-700' : 'font-medium text-slate-400';
    status.textContent = tool.href ? 'Abrir' : 'Próximamente';
    meta.append(status);

    body.append(title, description, meta);
    card.append(badge, body);
    grid.append(card);
  });

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className =
    'mt-3 text-[11px] font-medium text-slate-400 transition-colors hover:text-red-600';
  clear.textContent = 'Borrar historial';
  clear.addEventListener('click', () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin almacenamiento disponible.
    }
    container.replaceChildren(emptyState ? emptyState.cloneNode(true) : '');
  });

  container.replaceChildren(grid, clear);
}
