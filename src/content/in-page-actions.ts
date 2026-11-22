import type { InstagramActionTarget } from '@/adapters/instagram/in-page';
import { getErrorMessage } from '@/utils/errors';

export type InPageTone = 'success' | 'error' | 'info';

export interface InPageResult {
  message: string;
  tone: InPageTone;
}

export interface InPageActionsOptions {
  findTargets: () => InstagramActionTarget[];
  onDownload: (target: InstagramActionTarget) => Promise<InPageResult>;
}

export interface InPageActionsController {
  refresh: () => void;
  destroy: () => void;
}

const BUTTON_STYLE = `
  :host { all: initial; }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 8px;
    background: #5b5bd6;
    color: #fff;
    font: 600 12px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    transition: background-color 120ms ease, transform 120ms ease, opacity 120ms ease;
  }
  button:hover { background: #4a4ac4; }
  button:active { transform: translateY(1px); }
  button:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.75); outline-offset: 2px; }
  button:disabled { opacity: 0.65; cursor: progress; }
  .compact { width: 28px; padding: 0; }
  .compact span { display: none; }
  svg { width: 14px; height: 14px; flex: none; }
  @media (prefers-reduced-motion: reduce) {
    button { transition: none; }
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
`;

function createButtonHost(
  target: InstagramActionTarget,
  onDownload: (target: InstagramActionTarget) => Promise<InPageResult>,
  showToast: (message: string, tone: InPageTone) => void,
): HTMLElement {
  const host = document.createElement('span');
  host.dataset.mediavaultAction = target.id;
  host.setAttribute('aria-hidden', 'false');

  const compact = target.kind === 'grid';
  if (target.position === 'inline') {
    host.style.cssText = 'display:inline-flex;align-items:center;margin-left:6px;vertical-align:middle;';
  } else {
    if (
      target.mount.ownerDocument.defaultView?.getComputedStyle(target.mount).position ===
      'static'
    ) {
      target.mount.style.position = 'relative';
    }
    host.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:2147482000;display:block;';
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = BUTTON_STYLE;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'compact' : '';
  button.setAttribute(
    'aria-label',
    compact ? 'Download this Instagram media' : 'Download media with MediaVault',
  );
  button.title = compact ? 'Download with MediaVault' : 'Download this post with MediaVault';
  button.innerHTML = `${DOWNLOAD_ICON}<span>Download</span>`;

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (button.disabled) {
      return;
    }

    button.disabled = true;

    try {
      const result = await onDownload(target);
      showToast(result.message, result.tone);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      button.disabled = false;
    }
  });

  // Keep grid-anchor navigation and site action handlers from firing.
  host.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  shadow.append(style, button);
  return host;
}

export function startInPageActions(
  options: InPageActionsOptions,
): InPageActionsController {
  const hosts = new Map<string, HTMLElement>();
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

  const refresh = () => {
    let targets: InstagramActionTarget[];

    try {
      targets = options.findTargets().filter((target) => target.mount.isConnected);
    } catch {
      return;
    }

    const liveIds = new Set<string>();

    for (const target of targets) {
      liveIds.add(target.id);
      const existing = hosts.get(target.id);

      if (existing?.isConnected) {
        continue;
      }

      if (existing) {
        existing.remove();
      }

      const host = createButtonHost(target, options.onDownload, showToast);
      target.mount.appendChild(host);
      hosts.set(target.id, host);
    }

    for (const [id, host] of hosts) {
      if (!liveIds.has(id) || !host.isConnected) {
        host.remove();
        hosts.delete(id);
      }
    }
  };

  const destroy = () => {
    for (const host of hosts.values()) {
      host.remove();
    }
    hosts.clear();
    toastHost.remove();
  };

  return { refresh, destroy };
}
