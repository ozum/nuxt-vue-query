import { unref, computed, ComputedRef, onServerPrefetch } from "vue";
import { useLazyFetch } from "#imports";
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
  headers?: Record<string, string>;
}

interface QueryOptions<X, Y, Z, QKP extends any[]> extends UseQueryOptions<X, Y, Z> {
  queryKeyPrefix?: QKP;
  headers?: Record<string, string>;
}

type QueryKey<M extends RouterMethod, QKP extends any[], R extends Request<M>> = [...QKP, M, ...string[], Query<R, M> | undefined];

async function queryFn<M extends RouterMethod, R extends Request<M>>({ meta }: { meta: Meta<M, R> }): Promise<Response<R, M>>  {
  const { method, url, query, headers } = meta;
  const { data, error } = await useLazyFetch<Response<R, M>>(unref(url), { query, method, headers });
  if (error.value) throw error.value;
  return data.value;
}

export function useApiGet<
  TError = unknown,
  R extends Request<"get"> = Request<"get">,
  TQueryFnData = Response<R, "get">,
  TData = TQueryFnData,
  QKP extends any[] = []
>(url: URLWithParams<R>, query?: Query<R, "get">, options?: QueryOptions<TQueryFnData, TError, TData, QKP>) {
  const urlAddress =  computed (() => getUrl(url));
  const prefix = (options?.queryKeyPrefix || []) as QKP
  const queryKey = computed(() => [...prefix, "get", ...urlAddress.value.split("/").slice(1), query]) as ComputedRef<QueryKey<"get", QKP, R>>;
  const meta = computed(() => ({ ...options?.meta, url: urlAddress.value, query, method: "get", headers: options?.headers })) as ComputedRef<Meta<"get", R>>;
  const mergedOptions = { queryKey, queryFn: queryFn as any, ...options, meta };
  const result = useQuery(mergedOptions);
  onServerPrefetch(async () => await result.suspense()); // For Nuxt SSR.
  return { ...result, queryKey }; // Promise<UseQueryDefinedReturnType<TData, TError> & { queryKey: QueryKey<R> }>
}
