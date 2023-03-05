import { join, parse, basename, relative, extname } from "node:path";
import { genInterface } from "knitwork";
import { RouterMethod } from "h3";
import type { Nitro } from "nitropack";
import readdirRecursive from "./readdir-recursive";
import { Nuxt } from "@nuxt/schema";

type APIPath = string;
type ImportStatement = string;
type Method = RouterMethod | "default";
type ResponseType = string;

const HTTPMethods = ["get", "head", "patch", "post", "put", "delete", "connect", "options", "trace"];
const bracketsRegExp = /\[(.+?)\]/g;

/** Route interface similar to Nitro.js' interface returned from `nitro.scannedHandlers` and `nitro.options.handler`. */
interface Route {
  method: Method;
  route: string;
  handler: string;
}

/** Event type emitted by Nitro.js when a new file is added or removed. */
type Event = "add" | "unlink";

/**
 * Scans `api` and `routes` directories from given Nuxt server path recursively to retrieve server api handler files.
 *
 * @param serverDir is the full path to the Nuxt server directory.
 * @returns all files in `api` and `routes` relative to server path.
 *
 * @example
 * const files = readHandlerFilePaths('/project/server'); // [`/api/item.get.ts', 'routes/option.post.ts']
 */
async function readHandlerFilePaths(serverDir: string): Promise<string[]> {
  return (await readdirRecursive(join(serverDir, "api"), { base: serverDir }))
    .concat(await readdirRecursive(join(serverDir, "routes"), { base: serverDir }))
    .filter((file) => extname(file) === ".ts");
}

/**
 * Returns route details for the given path.
 *
 * @param serverDir is the full path to the Nuxt server directory.
 * @param path is the path of the file to get route details for. The path should be relative to the server path.
 * @returns route details for the given file.
 *
 * @example
 * const route = getRoute("/project/server", "api/item.get.ts"); // { method: "get", route: "/api/item", handler: "/project/server/api/item.get.ts" }
 */
function getRoute(serverDir: string, path: string): Route {
  const { dir, name } = parse(path);
  const method = HTTPMethods.find((method) => name.endsWith(`.${method.toLowerCase()}`)) as Method;
  const handler = join(serverDir, path);
  const route = join(dir, basename(name, `.${method}`)).replaceAll(bracketsRegExp, ":$1");
  return { method, route, handler };
}

/**
 * Scans `api` and `routes` directories from given Nuxt server path recursively to create routes.
 *
 * @param serverDir is the full path to the Nuxt server directory.
 * @returns all routes for the Nuxt server.
 *
 * @example
 * const routes = readRoutesFromFileSystem("/project/server"); // [{ method: "get", route: "/api/item", handler: "/project/server/api/item.get.ts" }, {...}]
 */
export async function readRoutesFromFileSystem(serverDir: string): Promise<Route[]> {
  return (await readHandlerFilePaths(serverDir)).map((path) => getRoute(serverDir, path));
}

/**
 * Gets all routes from Nitor.js. This is faster than scanning files, because Nitro.js already scanned the files previously.
 * However, currently, this is not available during Nuxt server start. We use it for the `builder:watch` events when a new
 * file is added or removed for faster response.
 *
 * @param nitro is the Nitro.js instance
 * @returns all routes for the Nuxt server.
 *
 * @example
 * const routes = readRoutesFromNitro(nitro); // [{ method: "get", route: "/api/item", handler: "/project/server/api/item.get.ts" }, {...}]
 */
export function readRoutesFromNitro(nitro: Nitro): Route[] {
  return [...nitro.scannedHandlers, ...nitro.options.handlers] as Route[];
}

/**
 * Adds to or removes from routes the route related to the given handler file path.
 *
 * @param routes are the list of Nuxt server routes.
 * @param nuxt is the nuxt object.
 * @param event is the event name.
 * @param path is the path of the file relative to project root. This is the path provided by `builder:watch` event.
 * @returns routes with the related route added or removed from.
 *
 * @example
 * const routes = addRemoveRoute({ routes, nuxt, path, event }); // [{ method: "get", route: "/api/item", handler: "/project/server/api/item.get.ts" }, {...}]
 */
export function addRemoveRoute({ routes, nuxt, event, path }: { routes: Route[]; nuxt: Nuxt; event?: Event; path?: string }): Route[] {
  const { rootDir, serverDir } = nuxt.options;
  if (event && path) {
    const fullPath = join(rootDir, path);
    if (event === "add") routes.push(getRoute(serverDir, join("/", relative(serverDir, fullPath))));
    else if (event === "unlink") {
      const unlinkedPathIndex = routes.findIndex((route) => route.handler === fullPath);
      routes.splice(unlinkedPathIndex, 1);
    }
  }

  return routes;
}

/**
 * Returns TypeScript interface as a string for all Nuxt server routes.
 *
 * @param routes are the list of Nuxt server routes.
 * @param buildDir is the path of the build directory of Nuxt project, usually `/.nuxt`.
 * @returns TypeScript interface.
 */
export function getSchemaInterface(routes: Route[], buildDir: string): string {
  const querySchemas: Record<APIPath, Record<Method, ImportStatement>> = {};
  const bodySchemas: Record<APIPath, Record<Method, ImportStatement>> = {};
  const parameterSchemas: Record<APIPath, { array: string; object: string }> = {};

  routes
    .filter(
      (r) =>
        typeof r.handler === "string" &&
        (r.route?.startsWith("/api/") || r.route?.startsWith("/routes/")) &&
        !r.route?.startsWith("/api/_") &&
        !r.route?.startsWith("/routes/_")
    )
    .forEach((r) => {
      const { method, route, handler } = r;
      const relativePath = relative(join(buildDir, "types"), handler).replace(/\.[a-z]+$/, "");
      const parameters = handler.match(bracketsRegExp)?.map((param) => param.substring(1, param.length - 1)); // "/project/server/api/[group]/[name]-xyz" -> ["group", "name"]

      if (!querySchemas[route]) querySchemas[route] = {} as any;
      querySchemas[route][method ?? "default"] = `import('${relativePath}').Query`;

      if (!bodySchemas[route]) bodySchemas[route] = {} as any;
      bodySchemas[route][method ?? "default"] = `import('${relativePath}').Body`;

      if (parameters && !parameterSchemas[route]) {
        parameterSchemas[route] = {
          array: `[${parameters.map(() => "MaybeRef<string | number>").join(", ")}]`,
          object: `{ ${parameters.map((p) => `${p}: MaybeRef<string | number>`).join(",\n")} }`,
        };
      }
    });

  return `
  declare module "nuxt-vue-query" {
    ${genInterface("InternalApiQuery", querySchemas)}
    ${genInterface("InternalApiBody", bodySchemas)}
    ${genInterface("InternalApiParameters", parameterSchemas)}
  }
  `;
}
