export interface DebouncedFunction<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): DebouncedFunction<TArgs> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: TArgs | undefined;

  const invoke = () => {
    timer = undefined;
    if (!lastArgs) {
      return;
    }

    const args = lastArgs;
    lastArgs = undefined;
    fn(...args);
  };

  const debounced = (...args: TArgs) => {
    lastArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(invoke, delay);
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = undefined;
    lastArgs = undefined;
  };

  debounced.flush = () => {
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    invoke();
  };

  return debounced;
}
