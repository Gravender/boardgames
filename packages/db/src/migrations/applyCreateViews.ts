import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const getCreateViewsSqlPath = () => {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirectory = dirname(currentFilePath);

  return resolve(currentDirectory, "0001_create_views.sql");
};

const getPostgresUrl = () => {
  const postgresUrl = process.env.POSTGRES_URL;

  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is not set");
  }

  return postgresUrl;
};

const runCreateViewsMigration = async () => {
  const sqlPath = getCreateViewsSqlPath();
  const sql = await readFile(sqlPath, "utf8");

  const client = new Client({
    connectionString: getPostgresUrl(),
  });

  await client.connect();

  try {
    await client.query(sql);
    console.log("Applied migration: 0001_create_views.sql");
  } finally {
    await client.end();
  }
};

await runCreateViewsMigration();
