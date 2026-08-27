// 公開デモのデプロイ専用スクリプト。
// Renderのstart時に一度だけ実行される想定:
//   1. drizzleのマイグレーション（スキーマ作成）を適用する
//   2. scripts/demo-fixture.json のデータを、まだ空の場合にだけ投入する
// 何度実行されても安全（冪等）に作ってある。DATABASE_URLが無い/
// ローカル開発用の場合は何もせずに終了する。
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[deploy-migrate-seed] DATABASE_URLが未設定のためスキップします。");
    return;
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log("[deploy-migrate-seed] マイグレーションを適用します...");
  await migrate(db, { migrationsFolder: path.join(__dirname, "..", "drizzle") });
  console.log("[deploy-migrate-seed] マイグレーション完了。");

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM regions`;
  if (count > 0) {
    console.log(
      `[deploy-migrate-seed] 既にデータが存在します（regions: ${count}件）。シードをスキップします。`
    );
    await sql.end();
    return;
  }

  const fixturePath = path.join(__dirname, "demo-fixture.json");
  if (!fs.existsSync(fixturePath)) {
    console.log("[deploy-migrate-seed] demo-fixture.jsonが見つかりません。シードをスキップします。");
    await sql.end();
    return;
  }
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

  const TABLES = [
    "regions",
    "users",
    "organizations",
    "user_organizations",
    "sources",
    "resources",
    "resource_notes",
    "resource_sources",
    "resource_relationships",
    "activity_opportunities",
    "activity_opportunity_resources",
    "photos",
    "platforms",
    "market_programs",
    "market_program_prices",
    "market_program_analysis",
    "programs",
    "program_activity_opportunities",
    "program_resources",
    "itineraries",
    "itinerary_items",
    "program_ai_reviews",
  ];

  // jsonb列は値がJSON配列だとpostgres.jsがpg配列型と誤認することがあるため、
  // 明示的にJSON値として投入する必要がある列をテーブルごとに指定する。
  const JSON_COLUMNS = {
    program_ai_reviews: [
      "diagnosis",
      "missing_research",
      "market_comparison",
      "improvement_ideas",
      "product_draft",
    ],
  };

  console.log("[deploy-migrate-seed] デモ用データを投入します...");
  await sql.begin(async (tx) => {
    // TABLES配列は依存関係の順（親テーブル→子テーブル）に並べてあるため、
    // 外部キー制約チェックを無効化しなくても順番どおり投入すればよい。
    // （Renderの管理DBユーザーはsession_replication_roleの変更権限を持たないため）
    for (const table of TABLES) {
      const rows = fixture[table] ?? [];
      if (rows.length === 0) {
        console.log(`  ${table}: 0件（スキップ）`);
        continue;
      }
      const jsonCols = JSON_COLUMNS[table] ?? [];
      if (jsonCols.length === 0) {
        await tx`INSERT INTO ${tx(table)} ${tx(rows)}`;
      } else {
        // jsonb列を含むテーブルは、postgres.jsの一括insertヘルパーの型推測に頼らず、
        // 1行ずつ明示的なプレースホルダ＋::jsonbキャストで投入する。
        for (const row of rows) {
          const columns = Object.keys(row);
          const colSql = columns.map((c) => `"${c}"`).join(", ");
          const placeholders = columns
            .map((col, i) =>
              jsonCols.includes(col) ? `$${i + 1}::jsonb` : `$${i + 1}`
            )
            .join(", ");
          const params = columns.map((col) =>
            jsonCols.includes(col) && row[col] !== null && row[col] !== undefined
              ? JSON.stringify(row[col])
              : row[col]
          );
          await tx.unsafe(
            `INSERT INTO ${table} (${colSql}) VALUES (${placeholders})`,
            params
          );
        }
      }
      console.log(`  ${table}: ${rows.length}件`);
    }
  });

  console.log("[deploy-migrate-seed] 完了しました。");
  await sql.end();
}

main().catch((err) => {
  console.error("[deploy-migrate-seed] エラー:", err);
  process.exit(1);
});
