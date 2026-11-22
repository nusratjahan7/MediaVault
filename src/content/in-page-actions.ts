import type { InPageActionTarget } from '@/types/in-page';
import { getErrorMessage } from '@/utils/errors';

export type InPageTone = 'success' | 'error' | 'info';
export type InPageButtonState =
  | 'idle'
  | 'detecting'
  | 'downloading'
  | 'completed'
  | 'failed';

export interface InPageResult {
  message: string;
  tone: InPageTone;
}

export interface InPageActionsOptions {
  findTargets: () => InPageActionTarget[];
  onDownload: (
    target: InPageActionTarget,
    setPhase: (phase: 'detecting' | 'downloading') => void,
  ) => Promise<InPageResult>;
}

export interface InPageActionsController {
  refresh: () => void;
  destroy: () => void;
}

interface MountedButton {
  host: HTMLElement;
  mount: HTMLElement;
  position: InPageActionTarget['position'];
}

const BUTTON_STYLE = `
  :host { all: initial; color: inherit; }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: currentColor;
    cursor: pointer;
    opacity: 0.9;
    transition: background-color 120ms ease, opacity 120ms ease, transform 120ms ease;
  }
  button:hover {
    background: rgba(128, 128, 128, 0.16);
    opacity: 1;
  }
  button:active { transform: scale(0.94); }
  button:focus-visible {
    outline: 2px solid rgba(124, 124, 242, 0.9);
    outline-offset: 2px;
  }
  button:disabled { cursor: progress; opacity: 0.9; }
  svg { width: 18px; height: 18px; flex: none; }
  :host(.overlay) button, :host(.overlay-left) button {
    color: #fff;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
  }
  :host(.overlay) button:hover, :host(.overlay-left) button:hover {
    background: rgba(0, 0, 0, 0.68);
  }
  .spinner {
    width: 15px;
    height: 15px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 999px;
    animation: mv-spin 700ms linear infinite;
  }
  .failed { color: #ff8a9a; }
  @keyframes mv-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    button { transition: none; }
    .spinner { animation-duration: 1.4s; }
  }
`;

const TOAST_STYLE = `
  :host { all: initial; }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
    font: 500 12px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .toast {
    max-width: 320px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #14141b;
    color: #f5f5f7;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    animation: rise 160ms ease-out both;
  }
  .success { border-color: rgba(52, 199, 149, 0.45); }
  .error { border-color: rgba(255, 107, 131, 0.5); }
  .info { border-color: rgba(124, 124, 242, 0.5); }
  @keyframes rise {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
  }
`;

const DOWNLOAD_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
`;

const CHECK_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
`;

const RETRY_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
    <path d="M3 3v5h5" />
  </svg>
`;

function ensureRelativePosition(mount: HTMLElement): void {
  if (mount.ownerDocument.defaultView?.getComputedStyle(mount).position === 'static') {
    mount.style.position = 'relative';
  }
}

function createButtonHost(
  target: InPageActionTarget,
  onDownload: InPageActionsOptions['onDownload'],
  showToast: (message: string, tone: InPageTone) => void,
): HTMLElement {
  const host = document.createElement('span');
  host.dataset.mediavaultAction = target.id;
  host.dataset.mediavaultPlatform = target.platform;
  host.dataset.mediavaultState = 'idle';
  host.setAttribute('aria-hidden', 'false');

  if (target.position === 'inline') {
    host.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;margin-left:4px;vertical-align:middle;';
  } else if (target.position === 'after') {
    host.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;margin-left:6px;vertical-align:middle;';
  } else if (target.position === 'overlay-left') {
    ensureRelativePosition(target.mount);
    host.style.cssText =
      'position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:2147482000;display:block;';
  } else {
    ensureRelativePosition(target.mount);
    host.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:2147482000;display:block;';
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = BUTTON_STYLE;

  const button = document.createElement('button');
  button.type = 'button';
  button.title = 'Download';
  button.setAttribute('aria-label', 'Download');
  button.innerHTML = DOWNLOAD_ICON;

  const setState = (state: InPageButtonState) => {
    host.dataset.mediavaultState = state;
    button.disabled =
      state === 'detecting' || state === 'downloading' || state === 'completed';

    if (state === 'detecting' || state === 'downloading') {
      button.title = state === 'detecting' ? 'Detecting media…' : 'Downloading…';
      button.setAttribute('aria-label', button.title);
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
      return;
    }

    if (state === 'completed') {
      button.title = 'Download started';
      button.setAttribute('aria-label', button.title);
      button.innerHTML = CHECK_ICON;
      return;
    }

    if (state === 'failed') {
      button.title = 'Retry download';
      button.setAttribute('aria-label', 'Retry download');
      button.className = 'failed';
      button.innerHTML = RETRY_ICON;
      return;
    }

    button.className = '';
    button.title = 'Download';
    button.setAttribute('aria-label', 'Download');
    button.innerHTML = DOWNLOAD_ICON;
  };

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (button.disabled) {
      return;
    }

    setState('detecting');

    try {
      const result = await onDownload(target, (phase) => {
        if (phase === 'downloading') {
          setState('downloading');
        }
      });

      showToast(result.message, result.tone);

      if (result.tone === 'success') {
        setState('completed');
        window.setTimeout(() => {
          if (host.isConnected) {
            setState('idle');
          }
        }, 2_500);
      } else if (result.tone === 'error') {
        setState('failed');
      } else {
        setState('idle');
      }
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setState('failed');
    }
  });

  host.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  shadow.append(style, button);
  setState('idle');
  return host;
}

export function startInPageActions(
  options: InPageActionsOptions,
): InPageActionsController {
  const hosts = new Map<string, MountedButton>();
  const toastHost = document.createElement('div');
  toastHost.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483647;pointer-events:none;';
  const toastShadow = toastHost.attachShadow({ mode: 'open' });
  const toastStyle = document.createElement('style');
  toastStyle.textContent = TOAST_STYLE;
  const stack = document.createElement('div');
  stack.className = 'stack';
  toastShadow.append(toastStyle, stack);

  (document.body ?? document.documentElement).appendChild(toastHost);

  const showToast = (message: string, tone: InPageTone) => {
    if (!message) {
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4_000);
  };

  const correctlyMounted = (
    entry: MountedButton,
    target: InPageActionTarget,
  ): boolean => {
    if (!entry.host.isConnected || entry.mount !== target.mount) {
      return false;
    }

    if (target.position === 'after') {
      return entry.host.previousElementSibling === target.mount;
    }

    return entry.host.parentElement === target.mount;
  };

  const refresh = () => {
    let targets: InPageActionTarget[];

    try {
      targets = options.findTargets().filter((target) => target.mount.isConnected);
    } catch {
      return;
    }

    const liveIds = new Set<string>();

    for (const target of targets) {
      liveIds.add(target.id);
      const existing = hosts.get(target.id);

      if (existing && correctlyMounted(existing, target)) {
        continue;
      }

      if (existing) {
        existing.host.remove();
        hosts.delete(target.id);
      }

      const host = createButtonHost(target, options.onDownload, showToast);

      if (target.position === 'after') {
        target.mount.insertAdjacentElement('afterend', host);
      } else {
        target.mount.appendChild(host);
      }

      if (target.position === 'overlay' || target.position === 'overlay-left') {
        host.classList.add(target.position);
      }

      hosts.set(target.id, {
        host,
        mount: target.mount,
        position: target.position,
      });
    }

    for (const [id, entry] of hosts) {
      if (!liveIds.has(id) || !entry.host.isConnected) {
        entry.host.remove();
        hosts.delete(id);
      }
    }
  };

  const destroy = () => {
    for (const entry of hosts.values()) {
      entry.host.remove();
    }
    hosts.clear();
    toastHost.remove();
  };

  return { refresh, destroy };
}
