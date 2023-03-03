import { writeFile } from "node:fs/promises";
import { defineNuxtModule, addPlugin, createResolver, addTemplate, addImports } from "@nuxt/kit";
import { QueryClient } from "@tanstack/vue-query";
import { defu } from "defu";
import type { Nitro } from "nitropack";
import { join, relative } from "node:path";
import { getRequestSchemaInterface, typesModuleName, readRoutesFromFileSystem, readRoutesFromNitro } from "./utils/get-query-schema-interface";
export interface ModuleOptions {
  /** Configuration to be passed to "@tanstack/vue-query" */
  queryClientConfig?: ConstructorParameters<typeof QueryClient>[0];
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-vue-query",
    configKey: "vueQuery",
    compatibility: { nuxt: "^3.0.0" },
  },
  defaults: {},
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    nuxt.options.runtimeConfig.public.vueQuery = defu(nuxt.options.runtimeConfig.public.vueQuery, options);
    let nitro: Nitro;

    // Capture Nitro server.
    nuxt.hook("nitro:init", (n) => {
      nitro = n;
    });


    nuxt.hook("builder:watch", async (event, path) => {
      const isAddRemoveEvent = event === "add" || event === "unlink";
      const isRouteFile = path.startsWith("server/api") || path.startsWith("server/routes");

      if (isAddRemoveEvent && isRouteFile) {
        const routes = await readRoutesFromNitro({ ...nuxt.options, nitro, event: event as any, eventFilePath: path })
        const content = getRequestSchemaInterface(routes, nuxt.options.buildDir);
        await writeFile(join(nuxt.options.buildDir, `types/${typesModuleName}.d.ts`), content);
      }
    });

    nuxt.hook("app:resolve", async (nuxtApp) => {
      const routes = await readRoutesFromFileSystem(nuxt.options.serverDir);
      addTemplate({
        filename: `types/${typesModuleName}.d.ts`,
        getContents: () => getRequestSchemaInterface(routes, nuxt.options.buildDir),
      });
    });

    // Include added types to the `./nuxt/nuxt.d.ts
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: `types/${typesModuleName}.d.ts` });
    });

    // Export all of Vue Query composables in addition to this module's composables.
    addImports([
      ...["useQuery", "useQueries", "useInfiniteQuery", "useMutation", "useIsFetching", "useIsMutating", "useQueryClient"].map((name) => ({
        name,
        from: "@tanstack/vue-query",
      })),
      { name: "useApiGet", from: resolve("runtime/composables/useQuery") },
      { name: "useApiPost", from: resolve("runtime/composables/useMutation") },
      { name: "useApiPut", from: resolve("runtime/composables/useMutation") },
      { name: "useApiDelete", from: resolve("runtime/composables/useMutation") },
    ]);

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve("runtime/plugins/vue-query"));
  },
});
