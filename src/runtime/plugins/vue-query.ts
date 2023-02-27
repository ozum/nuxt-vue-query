import type { DehydratedState } from "@tanstack/vue-query";
import { VueQueryPlugin, QueryClient, hydrate, dehydrate } from "@tanstack/vue-query";
import { useRuntimeConfig, useState, defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
  const vueQueryState = useState<DehydratedState | null>("vue-query");
  const options = useRuntimeConfig().public.vueQuery;

  // Modify your Vue Query global settings here
  const queryClient = new QueryClient(options.queryClientConfig);

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });

  if (process.server) {
    nuxtApp.hooks.hook("app:rendered", () => {
      vueQueryState.value = dehydrate(queryClient);
    });
  }

  if (process.client) {
    nuxtApp.hooks.hook("app:created", () => {
      hydrate(queryClient, vueQueryState.value);
    });
  }
});
