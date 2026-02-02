# Runed Integration for SelfHostableChat

This project now uses [Runed](https://runed.dev) - a collection of utilities for Svelte 5 that make composing powerful applications easier with Svelte Runes.

## What's New

### Runed-Based Stores (New)

We've refactored stores to use Runed's `PersistedState` for automatic localStorage synchronization:

#### Settings Store (`settings.svelte.ts`)
```typescript
import { settings, theme, isCompactMode } from '$lib/stores/settings.svelte';

// Access current settings (reactive)
$effect(() => {
  console.log(settings.current.theme);
});

// Update settings
settings.update({ theme: 'dark' });

// Check specific values
theme.current;        // 'dark' | 'light' | 'auto'
isCompactMode.current; // boolean
```

#### API Key Store (`apiKey.svelte.ts`)
```typescript
import { apiKey } from '$lib/stores/apiKey.svelte';

// Save API key
apiKey.save('your-api-key');

// Access current value
apiKey.current;

// Check loading/error states
apiKey.isLoading;
apiKey.error;
```

#### UI Store (`ui.svelte.ts`)
```typescript
import { ui, sidebar, theme } from '$lib/stores/ui.svelte';

// Toggle sidebar
ui.toggleLeftSidebar();

// Get effective theme (auto resolves to dark/light)
ui.effectiveTheme;

// Check sidebar state
sidebar.isCollapsed;
sidebar.width;
```

#### Model Store (`model.svelte.ts`)
```typescript
import { model, hiddenModels, customModels, currentModel, isMultiModel } from '$lib/stores/model.svelte';

// Select a model
model.selectModel('openai/gpt-4');

// Select multiple models
model.selectMultipleModels(['model1', 'model2']);

// Check derived values
currentModel.current;  // string
isMultiModel.current;  // boolean

// Manage hidden models
hiddenModels.hideModel('model-id');
hiddenModels.toggleModel('model-id');
```

### Runed Utilities

Import from `$lib/utils/runed-helpers.svelte.ts`:

#### onClickOutside
Close modals/dropdowns when clicking outside:
```svelte
<script>
  import { onClickOutside } from '$lib/utils/runed-helpers.svelte';
  
  let element = $state<HTMLElement | null>(null);
  
  onClickOutside(() => element, () => {
    // Close modal or dropdown
  });
</script>

<div bind:this={element}>...</div>
```

#### useKeyboardShortcut
Add keyboard shortcuts easily:
```typescript
import { useKeyboardShortcut } from '$lib/utils/runed-helpers.svelte';

// Simple shortcut
useKeyboardShortcut('Escape', () => closeModal());

// With modifiers
useKeyboardShortcut('k', () => openSearch(), { 
  ctrl: true,      // Ctrl/Cmd+K
  preventDefault: true 
});
```

#### useWindowSize
Reactive window size tracking:
```svelte
<script>
  import { useWindowSize } from '$lib/utils/runed-helpers.svelte';
  
  const windowSize = useWindowSize();
</script>

{#if windowSize.isMobile}
  <!-- Mobile layout -->
{/if}

<span>Width: {windowSize.width}</span>
```

#### useDebouncedValue
Debounce a reactive value:
```svelte
<script>
  import { useDebouncedValue } from '$lib/utils/runed-helpers.svelte';
  
  let searchQuery = $state('');
  const debouncedQuery = useDebouncedValue(() => searchQuery, 300);
  
  $effect(() => {
    // Only runs 300ms after user stops typing
    console.log(debouncedQuery.current);
  });
</script>

<input bind:value={searchQuery} />
```

#### useToggle
Simple boolean toggle state:
```svelte
<script>
  import { useToggle } from '$lib/utils/runed-helpers.svelte';
  
  const isOpen = useToggle(false);
</script>

<button onclick={isOpen.toggle}>
  {isOpen.current ? 'Close' : 'Open'}
</button>
```

#### usePrevious
Track previous value:
```svelte
<script>
  import { usePrevious } from '$lib/utils/runed-helpers.svelte';
  
  let count = $state(0);
  const previousCount = usePrevious(() => count);
</script>

<p>Current: {count}</p>
<p>Previous: {previousCount.current}</p>
```

#### useMediaQuery
Reactive media query:
```svelte
<script>
  import { useMediaQuery } from '$lib/utils/runed-helpers.svelte';
  
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
</script>
```

### Direct Runed Exports

All Runed utilities are re-exported from `$lib`:

```typescript
import { 
  watch,           // Watch for changes
  Debounced,       // Debounced class
  Throttled,       // Throttled class
  Previous,        // Previous class
  useDebounce,     // Debounce function
  useThrottle,     // Throttle function
  useEventListener,// Event listener hook
  IsMounted,       // Component mounted check
  activeElement,   // Track active element
  onClickOutside   // Click outside handler
} from '$lib';
```

## Migration Guide

### From old stores to Runed stores:

**Old way:**
```svelte
<script>
  import { settingsStore } from '$lib/stores/settingsStore';
  import { uiStore } from '$lib/stores/uiStore';
  
  let settings = $derived($settingsStore);
  let theme = $derived($uiStore.theme);
</script>
```

**New way:**
```svelte
<script>
  import { settings, ui } from '$lib/stores/settings.svelte';
  
  // Access directly in template or $effect
  $effect(() => {
    console.log(settings.current.theme);
  });
</script>

<!-- Or use $derived -->
<span>Theme: {ui.current.theme}</span>
```

### Important Notes

1. **File Extension**: Runed stores use `.svelte.ts` extension to enable Svelte 5 runes
2. **Reactivity**: Values are accessed via `.current` property
3. **Server-Side**: Stores handle server-side rendering automatically
4. **Hydration**: PersistedState automatically syncs with localStorage

## Benefits of Runed

1. **Less Boilerplate**: No more manual localStorage sync
2. **Better Reactivity**: Full Svelte 5 runes integration
3. **Type Safety**: Full TypeScript support
4. **Performance**: Optimized reactivity tracking
5. **Clean API**: Simple, consistent interfaces

## Resources

- [Runed Documentation](https://runed.dev)
- [Svelte 5 Runes](https://svelte.dev/blog/runes)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
