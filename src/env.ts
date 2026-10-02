import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.url(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const invalidVariables = [
    ...new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((name): name is string => typeof name === "string"),
    ),
  ];

  throw new Error(
    `Environment validation failed. Check these variables: ${invalidVariables.join(", ")}`,
  );
}

export const env = result.data;
