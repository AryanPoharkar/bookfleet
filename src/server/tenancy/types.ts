import type { getTenantDb } from "./tenant-db";

export type TenantDb = ReturnType<typeof getTenantDb>;
type TenantTransactionCallback = Extract<Parameters<TenantDb["$transaction"]>[0], (...args: never[]) => unknown>;
export type TenantTx = TenantTransactionCallback extends (tx: infer T) => unknown ? T : never;
