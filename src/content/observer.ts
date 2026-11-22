import { debounce } from '@/utils/debounce';

const URL_POLL_INTERVAL_MS = 1_000;
const MUTATION_DEBOUNCE_MS = 700;

export function startSpaObserver(onChange: () => void): () => void {
  let lastHref = window.location.href;

  const notify = debounce(onChange, MUTATION_DEBOUNCE_MS);

  const pollTimer = window.setInterval(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      notify();
    }
  }, URL_POLL_INTERVAL_MS);

  const observer = new MutationObserver(() => {
    notify();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      notify();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.clearInterval(pollTimer);
    observer.disconnect();
    notify.cancel();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
