<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: Nuxt Vue Query
- Package name: nuxt-vue-query
- Description: Type safe TanStack Vue Query module for Nuxt.
-->

# Nuxt Vue Query

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

![README](https://user-images.githubusercontent.com/1497060/221602402-7bb6d80b-2585-4b94-94a2-105d98a3e99b.png)

## Features

<!-- Highlight some of the features your module provide here -->
- Adds all [Tanstack Vue Query](https://tanstack.com/query/v4/docs/vue/overview) composables: `useQuery`, `useMutation`, etc.
- Add extra composables `useApiGet`, `useApiPost`, `useApiPut` and `useApiDelete` to easy access to Nuxt APIs.
- Generates and returns [Query Keys](https://tanstack.com/query/v4/docs/vue/guides/query-keys) automatically.
- Type safety for Nuxt API `query`, `post`, `parameters` and `responses`.
- Uses `useFetch()` under the hood to support SSR. (Why not `$fetch`? [See](https://github.com/nuxt/nuxt/discussions/18731))
- Clears queries from Nuxt cache immediately, because TanStack Query provides its own cache.

## Quick Setup

1. Add `nuxt-vue-query` and `@tanstack/vue-query`  dependency to your project

```bash
npm install --save-dev nuxt-vue-query
npm install @tanstack/vue-query
```

2. Add `nuxt-vue-query` to the `modules` section of `nuxt.config.ts`. Provide `vue-query` configuration.

```js
export default defineNuxtConfig({
  modules: ['nuxt-vue-query'],
  vueQuery: { queryClientConfig: { defaultOptions: { queries: { staleTime: 60000 } } } }
})
```

## Usage

All [Tanstack Vue Query](https://tanstack.com/query/v4/docs/vue/overview) features can be used as is:

```ts
const { isLoading, isError, data, error } = useQuery({ queryKey: ['todos'], queryFn: fetchTodoList })

const { isLoading, isError, error, isSuccess, mutate } = useMutation({
  mutationFn: (newTodo) => axios.post('/todos', newTodo),
})
mutate({ id: new Date(), title: 'Do Laundry' })
```

## Extra Features

### Typed Server Routes
Add type to server routes. For example `/api/item/[id]/[category]`

```ts
import type { H3Event } from "h3";

// Export `Query` and `Body` types.
export type Query = { language: string };
export type Body = { status: string };

export default eventHandler(async (event: H3Event) => {

});
```

### Using with Zod

Zod adds runtime data validation in addition to Type Script's type safety.

```ts
// Zod is optional, but really useful.
import type { H3Event } from "h3";
import { z, parseQueryAs, parseBodyAs, parseParamsAs } from "@sidebase/nuxt-parse";

const querySchema = z.object({ language: z.string().default("tr") });
const bodySchema = z.object({ status: z.string().default("ok") });
const parametersSchema = z.object({ id: z.preprocess(Number, z.number()), category: z.string() }).required({ id: true, name: true });

// Export `Query`, `Body` and `Parameters` types using Zod.
export type Query = z.infer<typeof querySchema>;
export type Body = z.infer<typeof bodySchema>;
export type Parameters = z.infer<typeof parametersSchema>;

export default eventHandler(async (event: H3Event) => {
  const { language } = parseQueryAs(event, querySchema);
  const { status } = parseBodyAs(event, bodySchema);
  const { id, name } = await parseParamsAs(event, parametersSchema);
});
```

### Using on Components

**Query for Nuxt API (get)**

```ts
const id = ref(123);
const category = ref("new-arrivals")
const query = reactive({ draft: true })

// Pass URL parameters:
const { isLoading, isError, data, error, queryKey } = await useApiGet(["/api/item/:category/:id", category, id], query, options);

// Without URL parameters:
const { isLoading, isError, data, error, queryKey } = await useApiGet("/api/prefs", query, options);
```

**Query for Nuxt API (post, put, delete)**

```ts
// Pass URL parameters:
const { isLoading, isError, error, isSuccess, mutate, mutateAsync } = await useApiPost("/api/item/:category/:id", options);
const data = await mutateAsync([category, id, { color: "red" }]);

// Without URL parameters:
const { isLoading, isError, error, isSuccess, mutate, mutateAsync } = await useApiPost("/api/prefs", options);
const data = await mutateAsync({ theme: "dark" });

const { isLoading, isError, error, isSuccess, mutate, mutateAsync } = await useApiPut("/api/prefs", options);
const { isLoading, isError, error, isSuccess, mutate, mutateAsync } = await useApiDelete("/api/prefs", options);
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-vue-query/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-vue-query

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-vue-query.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-vue-query

[license-src]: https://img.shields.io/npm/l/nuxt-vue-query.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-vue-query
