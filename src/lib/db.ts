export const databaseUrl = process.env.DATABASE_URL;

export function isDatabaseConfigured() {
  return Boolean(databaseUrl);
}