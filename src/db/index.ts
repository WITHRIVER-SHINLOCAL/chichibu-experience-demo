import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:localdev_password@127.0.0.1:5432/chichibu_os";

const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });
export { client };
