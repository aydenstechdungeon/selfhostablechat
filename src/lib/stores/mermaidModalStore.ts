import { writable } from 'svelte/store';

function createMermaidModalStore() {
    const { subscribe, set, update } = writable<{
        isOpen: boolean;
        code: string;
    }>({
        isOpen: false,
        code: ''
    });

    return {
        subscribe,
        open: (code: string) => set({ isOpen: true, code }),
        close: () => set({ isOpen: false, code: '' })
    };
}

export const mermaidModalStore = createMermaidModalStore();
