import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: ["../src/module"],
  vueQuery: {
    queryClientConfig: { defaultOptions: { queries: { staleTime: 2000 } } },
  },
});
