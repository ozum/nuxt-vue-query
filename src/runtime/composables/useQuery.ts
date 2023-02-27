import { unref, computed, ComputedRef } from "vue";
import type { RouterMethod } from "h3";
import { useQuery } from "@tanstack/vue-query";
import type { UseQueryOptions, QueryMeta } from "@tanstack/vue-query";
import getUrl from "../utils/get-url";
import type { Query, Response, URLWithParams, Request } from "./types";


// External URL Query Key: const url = new URL(urlAddress); return [...queryKeyPrefix, method, url.host, ...url.pathname.split("/").slice(1), query];

interface Meta<M extends RouterMethod, R extends Request<M>> extends QueryMeta {
  url: string;
  query?: Query<R, M>;
  method: M;
}

interface QueryOptions<X, Y, Z, QKP extends any[]> extends UseQueryOptions<X, Y, Z> {
  queryKeyPrefix?: QKP;
}

type QueryKey<M extends RouterMethod, QKP extends any[], R extends Request<M>> = [...QKP, M, ...string[], Query<R, M> | undefined];

const queryFn = function queryFn<M extends RouterMethod, R extends Request<M>>({ meta }: { meta: Meta<M, R> }): Response<R, M>  {
  const { method, url, query } = meta;
  return $fetch(unref(url), { query, method }) as Response<R, M>;
}

export async function useApiGet<
  TError = unknown,
  R extends Request<"get"> = Request<"get">,
  TQueryFnData = Response<R, "get">,
  TData = TQueryFnData,
  QKP extends any[] = []
>(url: URLWithParams<R>, query?: Query<R, "get">, options?: QueryOptions<TQueryFnData, TError, TData, QKP>) {
  const urlAddress =  computed (() => getUrl(url));
  const prefix = (options?.queryKeyPrefix || []) as QKP
  const queryKey = computed(() => [...prefix, "get", ...urlAddress.value.split("/").slice(1), query]) as ComputedRef<QueryKey<"get", QKP, R>>;
  const meta = computed(() => ({ ...options?.meta, url: urlAddress.value, query, method: "get" })) as ComputedRef<Meta<"get", R>>;
  const mergedOptions = { queryKey, queryFn: queryFn as any, ...options, meta };
  const result = useQuery(mergedOptions);
  if (typeof result.suspense == "function") await result.suspense();
  return { ...result, queryKey }; // Promise<UseQueryDefinedReturnType<TData, TError> & { queryKey: QueryKey<R> }>
}
