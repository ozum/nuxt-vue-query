import { defineNuxtModule, addPlugin, createResolver, addTemplate, addImports } from "@nuxt/kit";
import { QueryClient } from "@tanstack/vue-query";
import { defu } from 'defu';
import { join } from "node:path";
import { getRequestSchemaInterface, typesModuleName } from "./utils/get-query-schema-interface";

export interface ModuleOptions {
   /** Configuration to be passed to "@tanstack/vue-query" */
   queryClientConfig?: ConstructorParameters<typeof QueryClient>[0]
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-vue-query",
    configKey: "vueQuery",
    compatibility: { nuxt: '^3.0.0' }
  },
  defaults: {},
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.vueQuery =  defu(nuxt.options.runtimeConfig.public.vueQuery, options);

    // Add types template to .nuxt directory.
    nuxt.hook("app:resolve", (nuxtApp) => {
      addTemplate({
        filename: `types/${typesModuleName}.d.ts`,
        getContents: () => getRequestSchemaInterface(join(nuxtApp.dir, "server")),
      });
    });

    // Include added types to the `./nuxt/nuxt.d.ts
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: `types/${typesModuleName}.d.ts` });
    });

    // Export all of Vue Query composables in addition to this module's composables.
    addImports(
      [
        ...["useQuery", "useQueries", "useInfiniteQuery", "useMutation", "useIsFetching", "useIsMutating", "useQueryClient"].map(name => ({ name, from: "@tanstack/vue-query" })),
        { name: "useApiGet", from: resolve("runtime/composables/useQuery")  },
        { name: "useApiPost", from: resolve("runtime/composables/useMutation")  },
        { name: "useApiPut", from: resolve("runtime/composables/useMutation")  },
        { name: "useApiDelete", from: resolve("runtime/composables/useMutation")  },
        { name: "useX", from: resolve("runtime/composables/useQuery")  }
      ],
    );

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve("runtime/plugins/vue-query"));
  },
});
