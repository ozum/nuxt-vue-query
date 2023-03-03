import { join, parse, basename, relative, extname } from "node:path";
import { genInterface } from "knitwork";
import { RouterMethod } from "h3";
import type { Nitro } from "nitropack";
import readdirRecursive from "./readdir-recursive";
import { WatchEvent } from "unstorage";

export const typesModuleName = "nuxt-vue-query";

type APIPath = string;
type ImportStatement = string;
type Method = RouterMethod | "default";
type ResponseType = string;

const HTTPMethods = ["get", "head", "patch", "post", "put", "delete", "connect", "options", "trace"];
const bracketsRegExp = /\[(.+?)\]/g;

interface Route {
  method: Method;
  route: string;
  handler: string;
}

export type Event = "add" | "unlink";

async function readHandlerFilePaths(serverDir: string): Promise<string[]> {
  return (await readdirRecursive(join(serverDir, "api"), { base: serverDir }))
    .concat(await readdirRecursive(join(serverDir, "routes"), { base: serverDir }))
    .filter((file) => extname(file) === ".ts");
}

function getRoute(serverDir: string, path: string): Route {
  const { dir, name } = parse(path);
  const method = HTTPMethods.find((method) => name.endsWith(`.${method.toLowerCase()}`)) as Method;
  const handler = join(serverDir, path); // `/x/item.get` -> `/x/item`
  const route = join(dir, basename(name, `.${method}`)).replaceAll(bracketsRegExp, ":$1");
  return { method, route, handler };
}

export async function readRoutesFromFileSystem(serverDir: string): Promise<Route[]> {
  return (await readHandlerFilePaths(serverDir)).map((path) => getRoute(serverDir, path));
}

export async function readRoutesFromNitro({
  serverDir,
  rootDir,
  nitro,
  event,
  eventFilePath,
}: {
  serverDir: string;
  rootDir: string;
  nitro: Nitro;
  event?: Event;
  eventFilePath?: string;
}): Promise<Route[]> {
  const routes = [...nitro.scannedHandlers, ...nitro.options.handlers] as Route[];

  if (event && eventFilePath) {
    const fullPath = join(rootDir, eventFilePath);
    if (event === "add") routes.push(getRoute(serverDir, join("/", relative(serverDir, fullPath))));
    else if (event === "unlink") {
      const unlinkedPathIndex = routes.findIndex((route) => route.handler === fullPath);
      routes.splice(unlinkedPathIndex, 1);
    }
  }

  return routes;
}

export function getRequestSchemaInterface(routes: Route[], buildDir: string): string {
  const querySchemas: Record<APIPath, Record<Method, ImportStatement>> = {};
  const bodySchemas: Record<APIPath, Record<Method, ImportStatement>> = {};
  const parameterSchemas: Record<APIPath, { array: string; object: string }> = {};
  const responseSchemas: Record<APIPath, Record<Method, ResponseType>> = {};

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

      if (!responseSchemas[route]) responseSchemas[route] = {} as any;
      responseSchemas[route][method ?? "default"] = `Awaited<ReturnType<typeof import('${relativePath}').default>>`;

      if (parameters && !parameterSchemas[route]) {
        parameterSchemas[route] = {
          array: `[${parameters.map(() => "MaybeRef<string | number>").join(", ")}]`,
          object: `{ ${parameters.map((p) => `${p}: MaybeRef<string | number>`).join(",\n")} }`,
        };
      }
    });

  return `
  declare module "${typesModuleName}" {
    ${genInterface("InternalApiQuery", querySchemas)}
    ${genInterface("InternalApiBody", bodySchemas)}
    ${genInterface("InternalApiResponse", responseSchemas)}
    ${genInterface("InternalApiParameters", parameterSchemas)}
  }
  `;
}
