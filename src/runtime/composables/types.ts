import { EmptyObject, ConditionalExcept } from "type-fest";
import type { RouterMethod } from "h3";
import { MaybeRefDeep } from "@tanstack/vue-query/build/lib/types";
import type { InternalApiQuery, InternalApiBody, InternalApiParameters, InternalApiResponse } from "nuxt-vue-query";

// ─── Utility Methods ─────────────────────────────────────────────────────────
export type Maybe<T> = T | undefined;
export type UnknownData = "Unknown";

type TypeofKey2<T, R> = R extends keyof T ? T[R] : never;
type TypeofKey3<T, R, M> = M extends keyof TypeofKey2<T, R> ? TypeofKey2<T, R>[M] : never;

// ─── Core Types ──────────────────────────────────────────────────────────────
type SchemaWithMethod<T, M> = ConditionalExcept<{ [URL in keyof T as URL extends (`_${string}` | `/api/_${string}`) ? never : URL]: { [Method in keyof T[URL] as Method extends M ? Method : never]: T[URL][Method] } }, EmptyObject>;
type Schema<T, M extends RouterMethod> = SchemaWithMethod<T, M>;

export type Request<M extends RouterMethod, T = InternalApiQuery> = keyof Schema<T, M>;
export type Query<R, M extends RouterMethod> = MaybeRefDeep<TypeofKey3<InternalApiQuery, R, M>>;
export type Body<R, M extends RouterMethod> = MaybeRefDeep<TypeofKey3<InternalApiBody, R, M>>;
export type Response<R, M extends RouterMethod> = TypeofKey3<InternalApiResponse, R, M>;

type URLObjectParameters<R> = TypeofKey2<InternalApiParameters, R>["object"];
type URLArrayParameters<R> = TypeofKey2<InternalApiParameters, R>["array"];
export type URLWithParams<R> = [Extract<R, keyof InternalApiParameters>, URLObjectParameters<R> | URLArrayParameters<R>] | [Extract<R, keyof InternalApiParameters>, ...URLArrayParameters<R>] | Exclude<R, keyof InternalApiParameters>;
export type URLParamsWithBody<R, M extends RouterMethod> = R extends keyof InternalApiParameters ? [URLObjectParameters<R> | URLArrayParameters<R>, Body<R, M>] | [...URLArrayParameters<R>, Body<R, M>] : Body<R, M>;




