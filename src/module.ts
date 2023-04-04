import { writeFile } from "node:fs/promises";
import { defineNuxtModule, addPlugin, createResolver, addTemplate, addImports } from "@nuxt/kit";
import type { QueryClient } from "@tanstack/vue-query";
import { defu } from "defu";
import type { Nitro } from "nitropack";
import { join } from "node:path";
import { addRemoveRoute, getSchemaInterface, readRoutesFromFileSystem, readRoutesFromNitro } from "./utils/get-query-schema-interface";
import debounce from "lodash.debounce";

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

    async function rebuildTypesOnChange(event: any, path: any) {
      const isAddRemoveEvent = event === "add" || event === "unlink";
      const isRouteFile = path.startsWith("server/api") || path.startsWith("server/routes");

      if (isAddRemoveEvent && isRouteFile) {
        const routes = addRemoveRoute({ routes: readRoutesFromNitro(nitro), nuxt, path, event: event as any });
        const content = getSchemaInterface(routes, nuxt.options.buildDir);
        await writeFile(join(nuxt.options.buildDir, "types/nuxt-vue-query.d.ts"), content);
      }
    }

    async function buildTypes() {
      const routes = await readRoutesFromFileSystem(nuxt.options.serverDir);
      addTemplate({
        filename: "types/nuxt-vue-query.d.ts",
        getContents: () => getSchemaInterface(routes, nuxt.options.buildDir),
      });
    }

    nuxt.hook("app:resolve", buildTypes);
    nuxt.hook("nitro:init", (n) => {
      nitro = n;
    });
    nuxt.hook("builder:watch", debounce(rebuildTypesOnChange, 200)); // Rename fires two events, don't execute more  than necessary.
    nuxt.hook("prepare:types", ({ references }) => {
      // Include added types to the `./nuxt/nuxt.d.ts
      references.push({ path: "types/nuxt-vue-query.d.ts" });
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
