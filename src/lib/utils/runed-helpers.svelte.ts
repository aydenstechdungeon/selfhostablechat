import { watch, Debounced, Throttled, Previous, useDebounce, useThrottle, useEventListener, IsMounted, activeElement, onClickOutside } from 'runed';
import { untrack } from 'svelte';

export { watch, Debounced, Throttled, Previous, useDebounce, useThrottle, useEventListener, IsMounted, activeElement, onClickOutside };

/**
 * Helper to watch multiple sources and run a callback
 */
export function watchMultiple<T extends unknown[]>(
	sources: { [K in keyof T]: () => T[K] },
	callback: (values: T, previousValues: T | undefined) => void
) {
	let previousValues: T | undefined;

	$effect(() => {
		const currentValues = sources.map(source => source()) as T;

		untrack(() => {
			callback(currentValues, previousValues);
			previousValues = [...currentValues] as T;
		});
	});
}

/**
 * Hook to sync a value with localStorage (using PersistedState internally)
 * This is a convenience wrapper for simple cases
 */
export function createLocalStorageState<T>(key: string, defaultValue: T) {
	// This uses Svelte 5 runes internally
	let storedValue = $state<T>(defaultValue);

	// Load from localStorage on mount (client-side only)
	$effect(() => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem(key);
			if (stored) {
				try {
					storedValue = JSON.parse(stored);
				} catch (e) {
					console.error(`Failed to parse ${key} from localStorage:`, e);
				}
			}
		}
	});

	// Save to localStorage when value changes
	$effect(() => {
		const value = storedValue;
		if (typeof window !== 'undefined') {
			localStorage.setItem(key, JSON.stringify(value));
		}
	});

	return {
		get value() {
			return storedValue;
		},
		set value(v: T) {
			storedValue = v;
		}
	};
}

/**
 * Hook to handle keyboard shortcuts
 */
export function useKeyboardShortcut(
	key: string,
	callback: (event: KeyboardEvent) => void,
	options: { ctrl?: boolean; shift?: boolean; alt?: boolean; preventDefault?: boolean } = {}
) {
	useEventListener(
		() => document,
		'keydown',
		(event: KeyboardEvent) => {
			const matchKey = event.key.toLowerCase() === key.toLowerCase();
			const matchCtrl = options.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
			const matchShift = options.shift ? event.shiftKey : !event.shiftKey;
			const matchAlt = options.alt ? event.altKey : !event.altKey;

			if (matchKey && matchCtrl && matchShift && matchAlt) {
				if (options.preventDefault) {
					event.preventDefault();
				}
				callback(event);
			}
		}
	);
}

/**
 * Hook to track window size
 */
export function useWindowSize() {
	let width = $state(typeof window !== 'undefined' ? window.innerWidth : 0);
	let height = $state(typeof window !== 'undefined' ? window.innerHeight : 0);

	useEventListener(
		() => window,
		'resize',
		() => {
			width = window.innerWidth;
			height = window.innerHeight;
		}
	);

	return {
		get width() {
			return width;
		},
		get height() {
			return height;
		},
		get isMobile() {
			return width < 768;
		},
		get isTablet() {
			return width >= 768 && width < 1024;
		},
		get isDesktop() {
			return width >= 1024;
		}
	};
}

/**
 * Hook to detect if an element is in viewport
 */
export function useInViewport(
	element: () => HTMLElement | null,
	options?: IntersectionObserverInit
) {
	let isInViewport = $state(false);

	$effect(() => {
		const el = element();
		if (!el) return;

		const observer = new IntersectionObserver(([entry]) => {
			isInViewport = entry.isIntersecting;
		}, options);

		observer.observe(el);

		return () => observer.disconnect();
	});

	return {
		get current() {
			return isInViewport;
		}
	};
}

/**
 * Hook to handle media queries
 */
export function useMediaQuery(query: string) {
	let matches = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const media = window.matchMedia(query);
		matches = media.matches;

		const listener = (e: MediaQueryListEvent) => {
			matches = e.matches;
		};

		media.addEventListener('change', listener);
		return () => media.removeEventListener('change', listener);
	});

	return {
		get current() {
			return matches;
		}
	};
}

/**
 * Hook for counter with increment/decrement/reset
 */
export function useCounter(initialValue = 0) {
	let count = $state(initialValue);

	return {
		get count() {
			return count;
		},
		increment() {
			count++;
		},
		decrement() {
			count--;
		},
		reset() {
			count = initialValue;
		},
		set(value: number) {
			count = value;
		}
	};
}

/**
 * Hook to toggle a boolean state
 */
export function useToggle(initialValue = false) {
	let value = $state(initialValue);

	return {
		get current() {
			return value;
		},
		toggle() {
			value = !value;
		},
		setTrue() {
			value = true;
		},
		setFalse() {
			value = false;
		},
		set(v: boolean) {
			value = v;
		}
	};
}

/**
 * Hook to track previous value
 */
export function usePrevious<T>(value: () => T) {
	return new Previous(value);
}

/**
 * Hook to create debounced value
 */
export function useDebouncedValue<T>(value: () => T, delay: number) {
	return new Debounced(value, delay);
}

/**
 * Hook to create throttled value
 */
export function useThrottledValue<T>(value: () => T, delay: number) {
	return new Throttled(value, delay);
}
