import { join, parse, extname, basename } from "node:path";
import { genInterface } from "knitwork";
import { RouterMethod } from "h3";
import readdirRecursive from "./readdir-recursive";

export const typesModuleName = "nuxt-vue-query";

type APIPath = string;
type ImportStatement = string;
type Method = RouterMethod | "default";
type ResponseType = string

const HTTPMethods = ["get", "head", "patch", "post", "put", "delete", "connect", "options", "trace"];
const urlParameterRegExp = /\[(.+?)\]/g;

function getApiDetails(path: string): { method: Method; apiPath: string; importPath: string, parameters?: string[] } {
  const { dir, name } = parse(path);
  const method = (HTTPMethods.find((method) => name.endsWith(`.${method.toLowerCase()}`)) ?? "default") as Method;
  const methodlessName = basename(name, `.${method}`);
  const methodlessPath = join(dir, methodlessName);
  const apiPath = methodlessPath.replaceAll(urlParameterRegExp, ":$1");
  const parameters = methodlessPath.match(urlParameterRegExp)?.map(param => param.substring(1, param.length - 1));
  return { method, apiPath, importPath: `../../server${join(dir, name)}`, parameters };
}

export async function getRequestSchemaInterface(basePath: string): Promise<string> {
  const files = (await readdirRecursive(join(basePath, "api"), { base: basePath }))
    .concat(await readdirRecursive(join(basePath, "routes"), { base: basePath }))
    .filter((file) => extname(file) === ".ts");
  const querySchemas: Record<APIPath, Record<Method, ImportStatement>> = {};
  const bodySchemas: Record<APIPath, Record<Method, ImportStatement>> = {};
  const parameterSchemas: Record<APIPath, { array: string, object: string }> = {};
  const responseSchemas: Record<APIPath, Record<Method, ResponseType>> = {}

  files.forEach((file) => {
    const { method, apiPath, importPath, parameters } = getApiDetails(file);

    if (!querySchemas[apiPath]) querySchemas[apiPath] = {} as any;
    querySchemas[apiPath][method] = `import('${importPath}').Query`;

    if (!bodySchemas[apiPath]) bodySchemas[apiPath] = {} as any;
    bodySchemas[apiPath][method] = `import('${importPath}').Body`;

    if (!responseSchemas[apiPath]) responseSchemas[apiPath] = {} as any;
    responseSchemas[apiPath][method] = `Awaited<ReturnType<typeof import('${importPath}').default>>`;

    if (parameters && !parameterSchemas[apiPath]) {
      parameterSchemas[apiPath] = { array: `[${ parameters.map(() => "MaybeRef<string | number>").join(", ") }]`, object: `{ ${ parameters.map(p => `${p}: MaybeRef<string | number>`).join(",\n") } }` };
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
