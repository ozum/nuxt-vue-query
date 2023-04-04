import type { RouterMethod } from "h3";
import { useMutation } from "@tanstack/vue-query";
import type { VueMutationObserverOptions } from "@tanstack/vue-query/build/lib/useMutation";
import getUrl from "../utils/get-url";
import type { Response, URLParamsWithBody, Request, URLWithParams, Body } from "./types";

async function useApiMutation<
  TError = unknown,
  M extends RouterMethod = RouterMethod,
  R extends Request<M> = Request<M>,
  TData = Response<R, M>,
  TVariables = URLParamsWithBody<R, M>,
  TContext = unknown
>(method: M, url: R, options?: VueMutationObserverOptions<TData, TError, TVariables, TContext>) {
  const fn: any = (urlParamsWithBody: TVariables) => {
    const [body, urlWithParameters] = (
      Array.isArray(urlParamsWithBody)
        ? [urlParamsWithBody[urlParamsWithBody.length - 1], [url, urlParamsWithBody.slice(0, -1)]]
        : [urlParamsWithBody]
    ) as [Body<R, M>, URLWithParams<R>];
    const urlAddress = getUrl(urlWithParameters);
    return $fetch(urlAddress, { body: body as any, method });
  };
  return useMutation({ mutationFn: fn, ...options }); // UseMutationReturnType<TData, TError, TVariables, TContext>
}


export async function useApiPost<
  TError = unknown,
  R extends Request<"post"> = Request<"post">,
  TData = Response<R, "post">,
  TVariables = URLParamsWithBody<R, "post">,
  TContext = unknown
>(url: R, options?: VueMutationObserverOptions<TData, TError, TVariables, TContext>) {
  return useApiMutation("post", url, options);
}

export async function useApiPut<
  TError = unknown,
  R extends Request<"put"> = Request<"put">,
  TData = Response<R, "put">,
  TVariables = URLParamsWithBody<R, "put">,
  TContext = unknown
>(url: R, options?: VueMutationObserverOptions<TData, TError, TVariables, TContext>) {
  return useApiMutation("put", url, options);
}

export async function useApiDelete<
  TError = unknown,
  R extends Request<"delete"> = Request<"delete">,
  TData = Response<R, "delete">,
  TVariables = URLParamsWithBody<R, "delete">,
  TContext = unknown
>(url: R, options?: VueMutationObserverOptions<TData, TError, TVariables, TContext>) {
  return useApiMutation("delete", url, options);
}
