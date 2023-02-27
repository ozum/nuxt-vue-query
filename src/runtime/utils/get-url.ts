import { URLWithParams, URLObjectParameters, URLArrayParameters } from "../composables/types";
import { unref } from "vue";

const urlParameterRegExp = /:([a-zA-Z0-9_-]+)/g;

function parse<R>(urlParameter: URLWithParams<R>): {
  url: string;
  parameters?: URLObjectParameters<R> | URLArrayParameters<R> | undefined;
} {
  if (Array.isArray(urlParameter)) {
    const [url, parameters] =
      Array.isArray(urlParameter[1]) || typeof unref(urlParameter[1]) === "object"
        ? urlParameter
        : [urlParameter[0], urlParameter.slice(1)];
    return { url: url as string, parameters: parameters as URLObjectParameters<R> | URLArrayParameters<R> | undefined };
  }
  return { url: urlParameter as string };
}

export default function getUrl<R>(urlParameter: URLWithParams<R>): string {
  const { url, parameters } = parse(urlParameter);
  if (!parameters) return url;
  let i = 0;
  return Array.isArray(parameters)
    ? url.replaceAll(urlParameterRegExp, () => unref(parameters[i++]).toString())
    : url.replaceAll(urlParameterRegExp, (_: string, p1: keyof typeof parameters) => unref(parameters[p1]).toString());
}
