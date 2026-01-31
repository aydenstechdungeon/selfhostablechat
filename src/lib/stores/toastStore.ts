import { writable } from 'svelte/store';

interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
}

const createToastStore = () => {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
			const id = crypto.randomUUID();
			update(toasts => [...toasts, { id, message, type }]);
			setTimeout(() => {
				update(toasts => toasts.filter(t => t.id !== id));
			}, 3000);
		},
		remove: (id: string) => {
			update(toasts => toasts.filter(t => t.id !== id));
		}
	};
};

export const toastStore = createToastStore();