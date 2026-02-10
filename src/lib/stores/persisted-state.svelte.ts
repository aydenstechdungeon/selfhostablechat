
import { browser } from '$app/environment';

export class PersistedState<T> {
    #key: string;
    #value = $state<T>() as T;
    #default: T;

    constructor(key: string, initialValue: T) {
        this.#key = key;
        this.#default = initialValue;
        this.#value = initialValue;

        if (browser) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    this.#value = JSON.parse(stored);
                } catch (e) {
                    console.error(`Error parsing stored value for key "${key}":`, e);
                }
            }
        }

        $effect.root(() => {
            $effect(() => {
                if (browser) {
                    localStorage.setItem(this.#key, JSON.stringify(this.#value));
                }
            });
        });
    }

    get current(): T {
        return this.#value;
    }

    set current(newValue: T) {
        this.#value = newValue;
    }
}
