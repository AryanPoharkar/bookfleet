import { db } from "@/server/db";

const tenantModels = new Set([
  "Membership",
  "Service",
  "Staff",
  "StaffService",
  "WorkingHours",
  "TimeOff",
  "Customer",
  "Booking",
  "Invite",
]);

const filteredOperations = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

type ArgsWithWhere = {
  where?: Record<string, unknown>;
};

type DataRecord = Record<string, unknown>;

export function getTenantDb(businessId: string) {
  return db.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model === "Business") {
            if (["create", "createMany", "delete", "deleteMany"].includes(operation)) {
              throw new Error("Business writes must use raw db.");
            }
            if (filteredOperations.has(operation)) {
              const current = args as ArgsWithWhere;
              const scopedArgs = {
                ...args,
                where: { ...current.where, id: businessId },
              } as typeof args;
              return query(scopedArgs);
            }
            throw new Error(`Operation ${operation} is not permitted through the tenant client.`);
          }

          if (!tenantModels.has(model)) return query(args);

          if (operation === "create" || operation === "createMany") {
            const data = (args as { data: unknown }).data;
            if (Array.isArray(data)) {
              const scopedData = data.map((item) => {
                const record = item as DataRecord;
                if (record.businessId && record.businessId !== businessId) {
                  throw new Error("Tenant mismatch.");
                }
                return { ...record, businessId };
              });
              return query({ ...args, data: scopedData } as typeof args);
            }

            const record = data as DataRecord;
            if (record.businessId && record.businessId !== businessId) {
              throw new Error("Tenant mismatch.");
            }
            return query({ ...args, data: { ...record, businessId } } as typeof args);
          }

          if (filteredOperations.has(operation)) {
            const current = args as ArgsWithWhere;
            const scopedArgs = {
              ...args,
              where: { ...current.where, businessId },
            } as typeof args;
            return query(scopedArgs);
          }

          throw new Error(`Operation ${operation} is not permitted through the tenant client.`);
        },
      },
    },
  });
}
