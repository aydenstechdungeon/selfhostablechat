# TanStack Query Implementation

## Setup

TanStack Query (formerly React Query) is now configured for Svelte 5.

### Files Created

- **`src/lib/query/client.ts`** - Query client factory with default config
- **`src/lib/query/helpers.ts`** - Query helpers with `neverthrow` integration

### Configuration

Updated `src/routes/+layout.svelte` to wrap app with `QueryClientProvider`.

## Usage

### Basic Query

```svelte
<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';

	const todos = createQuery(() => ({
		queryKey: ['todos'],
		queryFn: async () => {
			const res = await fetch('/api/todos');
			return res.json();
		}
	}));
</script>

{#if $todos.isPending}
	<p>Loading...</p>
{:else if $todos.isError}
	<p>Error: {$todos.error.message}</p>
{:else if $todos.data}
	{#each $todos.data as todo}
		<div>{todo.title}</div>
	{/each}
{/if}
```

### With `neverthrow` (Recommended)

```svelte
<script lang="ts">
	import { createSafeQuery } from '$lib/query/helpers';
	import { ok, err } from 'neverthrow';

	const users = createSafeQuery(
		async () => {
			try {
				const res = await fetch('/api/users');
				if (!res.ok) return err(new Error(`HTTP ${res.status}`));
				const data = await res.json();
				return ok(data);
			} catch (e) {
				return err(e instanceof Error ? e : new Error('Unknown'));
			}
		},
		{
			queryKey: ['users']
		}
	);
</script>
```

### Mutations

```svelte
<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';

	const queryClient = useQueryClient();

	const addTodo = createMutation(() => ({
		mutationFn: (newTodo: { title: string }) =>
			fetch('/api/todos', {
				method: 'POST',
				body: JSON.stringify(newTodo)
			}).then(r => r.json()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['todos'] });
		}
	}));

	const handleSubmit = () => {
		$addTodo.mutate({ title: 'New todo' });
	};
</script>

<button onclick={handleSubmit} disabled={$addTodo.isPending}>
	{$addTodo.isPending ? 'Adding...' : 'Add Todo'}
</button>
```

## Key Features

- ✅ Browser-only queries (SSR safe)
- ✅ 1min default stale time
- ✅ Exponential retry backoff
- ✅ neverthrow integration for type-safe errors
- ✅ Svelte 5 runes compatible ($state)

## Docs

https://tanstack.com/query/latest/docs/framework/svelte/overview

---

## Real-World Examples

### Chat Queries

```svelte
<script lang="ts">
	import { useChatsQuery, useDeleteChatMutation } from '$lib/query/chat.queries';

	let searchQuery = $state('');
	const chats = $derived(useChatsQuery({ search: searchQuery, sortBy: 'date' }));
	const deleteMutation = useDeleteChatMutation();

	const handleDelete = (chatId: string) => {
		$deleteMutation.mutate(chatId);
	};
</script>

{#if $chats.isPending}
	<p>Loading...</p>
{:else if $chats.data?.isOk()}
	{#each $chats.data.value as chat}
		<div>{chat.title}</div>
		<button onclick={() => handleDelete(chat.id)}>Delete</button>
	{/each}
{/if}
```

### Dashboard Stats

```svelte
<script lang="ts">
	import { useChatsStatsQuery } from '$lib/query/chat.queries';

	const stats = useChatsStatsQuery();
</script>

{#if $stats.data?.isOk()}
	{@const data = $stats.data.value}
	<div>Total Cost: ${data.totalCost.toFixed(2)}</div>
	<div>Total Chats: {data.totalChats}</div>
	<div>Total Messages: {data.totalMessages}</div>
{/if}
```

### Models from OpenRouter

```svelte
<script lang="ts">
	import { useModelsQuery } from '$lib/query/models.queries';

	const models = useModelsQuery();
</script>

{#if $models.isPending}
	<p>Loading models...</p>
{:else if $models.data?.isOk()}
	<select>
		{#each $models.data.value as model}
			<option value={model.id}>{model.name}</option>
		{/each}
	</select>
{/if}
```

## Example Components

See these files for full implementations:
- **`src/lib/components/dashboard/QueryStatsDemo.svelte`** - Dashboard stats with TanStack Query
- **`src/lib/components/sidebar/QueryChatList.svelte`** - Chat list with search, filters, and mutations

## When to Use Queries vs Stores

### Use TanStack Query for:
- ✅ Server data fetching (API calls, database queries)
- ✅ Automatic caching and background refetching
- ✅ Optimistic updates
- ✅ Pagination and infinite scroll
- ✅ Data that changes infrequently

### Use Svelte Stores for:
- ✅ Streaming data (SSE, WebSocket)
- ✅ Real-time UI state (modal open/close, theme)
- ✅ Complex client-side state machines
- ✅ Data that requires immediate synchronous access

## Docs

https://tanstack.com/query/latest/docs/framework/svelte/overview
