import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  real,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

// ═════════════════════════════════════════════════════════════
// ENUM定義
// ═════════════════════════════════════════════════════════════

export const USER_ROLES = ["admin", "staff"] as const;
export const userRoleEnum = pgEnum("user_role", USER_ROLES);

export const ORG_ROLES = ["owner", "staff", "viewer"] as const;
export const orgRoleEnum = pgEnum("org_role", ORG_ROLES);

// FACT / INFERENCE / IDEA — このプロダクトで最も重要な区分
export const FACT_STATUSES = ["FACT", "INFERENCE", "IDEA"] as const;
export const factStatusEnum = pgEnum("fact_status", FACT_STATUSES);

export const RESOURCE_CATEGORIES = [
  "NATURE",
  "CREATURES",
  "GEOLOGY",
  "CULTURE",
  "HISTORY",
  "INDUSTRY",
  "FOOD",
  "PEOPLE",
  "PLACE",
  "STORY",
] as const;
export const resourceCategoryEnum = pgEnum("resource_category", RESOURCE_CATEGORIES);

export const SOURCE_TYPES = [
  "government",
  "museum",
  "academic",
  "dmo",
  "tourism_association",
  "official_shrine_temple",
  "local_business",
  "industry_association",
  "expert",
  "blog",
  "sns",
  "platform",
  "other",
] as const;
export const sourceTypeEnum = pgEnum("source_type", SOURCE_TYPES);

export const RELIABILITY_GRADES = ["A", "B", "C", "D"] as const;
export const reliabilityGradeEnum = pgEnum("reliability_grade", RELIABILITY_GRADES);

export const RELATIONSHIP_CATEGORIES = [
  "geological",
  "ecological",
  "hydrological",
  "cultural",
  "spiritual",
  "historical",
  "economic",
  "other",
] as const;
export const relationshipCategoryEnum = pgEnum(
  "relationship_category",
  RELATIONSHIP_CATEGORIES
);

export const PERMISSION_STATUSES = [
  "unconfirmed",
  "requested",
  "granted",
  "denied",
] as const;
export const permissionStatusEnum = pgEnum("permission_status", PERMISSION_STATUSES);

export const PROGRAM_STATUSES = [
  "IDEA",
  "RESEARCH",
  "FIELD_CHECK",
  "PROTOTYPE",
  "VALIDATED",
  "READY",
  "ACTIVE",
  "ARCHIVED",
] as const;
export const programStatusEnum = pgEnum("program_status", PROGRAM_STATUSES);

// 推奨語彙（DB制約はしない。プラットフォームごとの表記ゆれに対応する「柔軟性」を優先する設計判断のため text 型で運用）
export const RECOMMENDED_PRICE_TYPES = [
  "child",
  "adult",
  "family",
  "group",
  "additional_child",
  "material",
  "other",
] as const;

export const SEASONS = ["spring", "summer", "autumn", "winter", "all"] as const;

// MVP実運用テスト用の簡易評価（正式なプロダクト機能ではなく、検証目的の暫定実装）
export const EASE_RATINGS = ["easy", "normal", "hard"] as const;
export const easeRatingEnum = pgEnum("ease_rating", EASE_RATINGS);

// MVP実運用テスト用: 「このアプリを使わなかった場合、この企画を思いつけたか」の指標
// （作業効率化ではなく新しい企画発見につながっているかを検証するための質問。正式なプロダクト機能ではない）
export const IDEATION_COUNTERFACTUALS = ["would_have", "partially", "would_not_have"] as const;
export const ideationCounterfactualEnum = pgEnum(
  "ideation_counterfactual",
  IDEATION_COUNTERFACTUALS
);

// ═════════════════════════════════════════════════════════════
// REGION（地域マスタ）— 秩父にハードコードせず region_id で地域拡張できる設計の起点
// ═════════════════════════════════════════════════════════════

export const regions = pgTable("regions", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentRegionId: uuid("parent_region_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════════
// USER / ORGANIZATION（将来のマルチ組織対応を見据えた設計。MVPは単一組織運用）
// ═════════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  // 推奨語彙: internal/dmo/tourism_business/education_company/municipality/other_region_operator（自由記述、DB制約なし）
  orgType: text("org_type"),
  homeRegionId: uuid("home_region_id").references(() => regions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userOrganizations = pgTable(
  "user_organizations",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleInOrg: orgRoleEnum("role_in_org").notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.organizationId)]
);

// ═════════════════════════════════════════════════════════════
// SOURCE（出典管理）
// ═════════════════════════════════════════════════════════════

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  organization: text("organization"),
  sourceType: sourceTypeEnum("source_type").notNull(),
  reliabilityGrade: reliabilityGradeEnum("reliability_grade").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  accessedAt: timestamp("accessed_at", { withTimezone: true, mode: "date" }).notNull(),
  notes: text("notes"),
  // MVP実運用テスト用: シードデータ等のサンプルであることを示すフラグ（正式プロダクト機能ではない）
  isSample: boolean("is_sample").notNull().default(false),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════════
// RESOURCE（地域資源）
// ═════════════════════════════════════════════════════════════

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey(),
  regionId: uuid("region_id")
    .notNull()
    .references(() => regions.id),
  category: resourceCategoryEnum("category").notNull(),
  name: text("name").notNull(),
  summary: text("summary").notNull().default(""),
  background: text("background"),
  history: text("history"),
  seasons: text("seasons").array().notNull().default(sql`'{}'::text[]`),
  targetAge: text("target_age"),
  educationTheme: text("education_theme"),
  // まだACTIVITY_OPPORTUNITYとして整理する前の走り書きメモ（正式な体験可能性情報はACTIVITY_OPPORTUNITY側で管理）
  experiencePotentialNote: text("experience_potential_note"),
  ownerManager: text("owner_manager"),
  collaborators: text("collaborators"),
  url: text("url"),
  lat: real("lat"),
  lng: real("lng"),
  safetyNotes: text("safety_notes"),
  rainPolicy: text("rain_policy"),
  priceInfo: text("price_info"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  memo: text("memo"),
  factStatus: factStatusEnum("fact_status").notNull().default("INFERENCE"),
  confidence: integer("confidence"),
  verifiedById: uuid("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  // MVP実運用テスト用: シードデータ等のサンプルであることを示すフラグ（正式プロダクト機能ではない）
  isSample: boolean("is_sample").notNull().default(false),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
});

// 地域資源に対する補足情報・考察の積み上げ（FACT/INFERENCE/IDEAを都度明示）
export const resourceNotes = pgTable("resource_notes", {
  id: uuid("id").primaryKey(),
  resourceId: uuid("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id), // null=共有ナレッジ, 値あり=組織内限定
  factStatus: factStatusEnum("fact_status").notNull(),
  body: text("body").notNull(),
  sourceId: uuid("source_id").references(() => sources.id),
  confidence: integer("confidence"),
  createdBy: text("created_by").notNull(), // ユーザーUUID文字列 または "ai"
  humanApproved: boolean("human_approved").notNull().default(false),
  verifiedById: uuid("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 地域資源 ⇄ 出典（多対多）
export const resourceSources = pgTable(
  "resource_sources",
  {
    id: uuid("id").primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    note: text("note"),
  },
  (t) => [unique().on(t.resourceId, t.sourceId)]
);

// ═════════════════════════════════════════════════════════════
// RESOURCE_RELATIONSHIP（地域資源同士の関係性。有向グラフ）
// ═════════════════════════════════════════════════════════════

export const resourceRelationships = pgTable("resource_relationships", {
  id: uuid("id").primaryKey(),
  fromResourceId: uuid("from_resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  toResourceId: uuid("to_resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  relationshipCategory: relationshipCategoryEnum("relationship_category").notNull(),
  relationshipLabel: text("relationship_label").notNull(),
  description: text("description"),
  factStatus: factStatusEnum("fact_status").notNull().default("INFERENCE"),
  sourceId: uuid("source_id").references(() => sources.id),
  confidence: integer("confidence"),
  createdBy: text("created_by").notNull(), // ユーザーUUID文字列 または "ai"
  humanApproved: boolean("human_approved").notNull().default(false),
  // MVP実運用テスト用: シードデータ等のサンプルであることを示すフラグ（正式プロダクト機能ではない）
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════════
// ACTIVITY_OPPORTUNITY（体験機会）— RESOURCEとPROGRAMをつなぐ最重要レイヤー
// ═════════════════════════════════════════════════════════════

export const activityOpportunities = pgTable("activity_opportunities", {
  id: uuid("id").primaryKey(),
  primaryResourceId: uuid("primary_resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  requiredGroupSizeMin: integer("required_group_size_min"),
  requiredGroupSizeMax: integer("required_group_size_max"),
  appropriateAgeMin: integer("appropriate_age_min"),
  appropriateAgeMax: integer("appropriate_age_max"),
  durationMinutesMin: integer("duration_minutes_min"),
  durationMinutesMax: integer("duration_minutes_max"),
  requiredEquipment: text("required_equipment").array().notNull().default(sql`'{}'::text[]`),
  permissionRequired: boolean("permission_required"),
  permissionRequiredFrom: text("permission_required_from"),
  permissionStatus: permissionStatusEnum("permission_status"),
  safetyRisks: text("safety_risks"),
  seasons: text("seasons").array().notNull().default(sql`'{}'::text[]`),
  rainPolicy: text("rain_policy"),
  needsGuide: boolean("needs_guide"),
  collaboratorsNote: text("collaborators_note"),
  accessNotes: text("access_notes"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  derivedFromRelationshipId: uuid("derived_from_relationship_id").references(
    () => resourceRelationships.id
  ),
  factStatus: factStatusEnum("fact_status").notNull().default("IDEA"),
  confidence: integer("confidence"),
  sourceId: uuid("source_id").references(() => sources.id),
  // 「できそう」という推測をFACTにしないための現地確認記録（実装時の追加配慮 #1への対応）
  fieldCheckedAt: timestamp("field_checked_at", { withTimezone: true }),
  fieldCheckedById: uuid("field_checked_by_id").references(() => users.id),
  createdBy: text("created_by").notNull(), // ユーザーUUID文字列 または "ai"
  humanApproved: boolean("human_approved").notNull().default(false),
  // MVP実運用テスト用: シードデータ等のサンプルであることを示すフラグ（正式プロダクト機能ではない）
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 体験機会が主資源以外にも関わる場合の中間テーブル
export const activityOpportunityResources = pgTable(
  "activity_opportunity_resources",
  {
    id: uuid("id").primaryKey(),
    activityOpportunityId: uuid("activity_opportunity_id")
      .notNull()
      .references(() => activityOpportunities.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    note: text("note"),
  },
  (t) => [unique().on(t.activityOpportunityId, t.resourceId)]
);

// 写真（著作権・利用条件を管理するためURL配列ではなくテーブル化）
export const photos = pgTable("photos", {
  id: uuid("id").primaryKey(),
  resourceId: uuid("resource_id").references(() => resources.id, { onDelete: "cascade" }),
  activityOpportunityId: uuid("activity_opportunity_id").references(
    () => activityOpportunities.id,
    { onDelete: "cascade" }
  ),
  url: text("url").notNull(),
  caption: text("caption"),
  sourceId: uuid("source_id").references(() => sources.id),
  rightsNote: text("rights_note"),
  uploadedById: uuid("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════════
// 市場データ：PLATFORM / MARKET_PROGRAM（RAW FACT）/ MARKET_PROGRAM_PRICE（RAW FACT）
// ═════════════════════════════════════════════════════════════

export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().unique(),
  url: text("url"),
  notes: text("notes"),
});

export const marketPrograms = pgTable("market_programs", {
  id: uuid("id").primaryKey(),
  programName: text("program_name"),
  url: text("url"),
  platformId: uuid("platform_id").references(() => platforms.id),
  categoryRaw: text("category_raw"), // プラットフォーム側の表記そのまま（正規化はクエリ層で実施）
  areaText: text("area_text"),
  matchedRegionId: uuid("matched_region_id").references(() => regions.id),
  targetAgeMin: integer("target_age_min"),
  targetAgeMax: integer("target_age_max"),
  durationMinutes: integer("duration_minutes"),
  capacityMin: integer("capacity_min"),
  capacityMax: integer("capacity_max"),
  parentAccompaniment: text("parent_accompaniment"),
  title: text("title"),
  catchCopy: text("catch_copy"),
  description: text("description"),
  flow: text("flow"),
  mainActivities: text("main_activities").array().notNull().default(sql`'{}'::text[]`),
  learningElements: text("learning_elements").array().notNull().default(sql`'{}'::text[]`),
  takeawayElements: text("takeaway_elements").array().notNull().default(sql`'{}'::text[]`),
  // Market Research v2: 元ページ上の訴求文・キャッチーな一文をそのまま採取する中立的なRAW FACTフィールド。
  // 「親向け」「子ども向け」等の分類はここでは行わない（分類自体が解釈のため）。分類・解釈はMARKET_PROGRAM_ANALYSIS側で行う。
  marketingMessages: text("marketing_messages").array().notNull().default(sql`'{}'::text[]`),
  // Market Research v2: 講師・ガイド・案内人の氏名や役割（元ページに明記されたものをそのまま記載。1行1名の自由記述）
  instructorNotes: text("instructor_notes").array().notNull().default(sql`'{}'::text[]`),
  reviewRating: real("review_rating"),
  reviewCount: integer("review_count"),
  // Market Research v2: レビュー情報（件数・評価点）を確認した日時。review_rating/review_count自体はFACTだが、
  // レビュー全文やレビューからの解釈（子どもの反応・安全性評価等）はMARKET_PROGRAM_ANALYSIS側で扱う。
  reviewCheckedAt: timestamp("review_checked_at", { withTimezone: true }),
  eventDates: text("event_dates").array().notNull().default(sql`'{}'::text[]`), // Phase2でMARKET_PROGRAM_SCHEDULEに分離可能な設計
  bookingStatus: text("booking_status"),
  fullBookedFlag: boolean("full_booked_flag"),
  safetyManagement: text("safety_management"),
  rainPolicy: text("rain_policy"),
  cancellationPolicy: text("cancellation_policy"),
  estimatedFields: text("estimated_fields").array().notNull().default(sql`'{}'::text[]`), // AIが推測して埋めた項目名
  // Market Research v2: 「調査したが元ページに記載がなかった」ことを確認済みのチェックリスト項目キーの一覧。
  // MARKET_RESEARCH_CHECKLIST_ITEMS（16項目）のkeyを格納する。値が入っている項目は自動的に「値あり」と判定されるため、
  // ここには「値が空 かつ 調査済み」の項目のみを入れる。未収集（このリストにも無く値も無い）と区別するためのフィールド。
  researchedEmptyItems: text("researched_empty_items").array().notNull().default(sql`'{}'::text[]`),
  sourceId: uuid("source_id").references(() => sources.id),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  // MVP実運用テスト用: シードデータ等のサンプルであることを示すフラグ（正式プロダクト機能ではない）
  isSample: boolean("is_sample").notNull().default(false),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 価格（複数パターンに対応する行指向テーブル）
export const marketProgramPrices = pgTable("market_program_prices", {
  id: uuid("id").primaryKey(),
  marketProgramId: uuid("market_program_id")
    .notNull()
    .references(() => marketPrograms.id, { onDelete: "cascade" }),
  priceType: text("price_type").notNull(), // 推奨語彙: RECOMMENDED_PRICE_TYPES（DB制約はしない）
  amount: integer("amount").notNull(),
  unit: text("unit"),
  taxIncluded: boolean("tax_included"),
  materialIncluded: boolean("material_included"),
  target: text("target"),
  notes: text("notes"),
  // Market Research v2: 価格条件の構造化（notesへの埋没を防ぐ）
  conditionAgeMin: integer("condition_age_min"),
  conditionAgeMax: integer("condition_age_max"),
  residencyCondition: text("residency_condition"), // 例：「市内」「市外」
  courseName: text("course_name"), // 例：「ほぐし捺染」「じっくりコース」
  // Market Research v2: 体験本体価格ではなく付随費用（入館料・駐車場代等）かどうか
  isAncillary: boolean("is_ancillary").notNull().default(false),
  // Market Research v2: 付随費用のうち、必須（入館料等）かオプション（駐車場等）かを区別する。
  // isAncillary=falseの通常行では実質的に無意味（常にtrue扱い＝参加に必須の本体価格）。
  isRequired: boolean("is_required").notNull().default(true),
  sourceId: uuid("source_id").references(() => sources.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Market Research v2: MARKET_PROGRAMのRAW FACTから読み取れる解釈（INFERENCE）を、
// RAW FACT層とは明確に分離して保持するための分析テーブル。1プログラムにつき1レコード（都度上書き更新）。
export const marketProgramAnalysis = pgTable("market_program_analysis", {
  id: uuid("id").primaryKey(),
  marketProgramId: uuid("market_program_id")
    .notNull()
    .unique()
    .references(() => marketPrograms.id, { onDelete: "cascade" }),
  // marketing_messages（RAW FACT）から読み取れる解釈（すべてINFERENCE）
  parentAppeal: text("parent_appeal"),
  childAppeal: text("child_appeal"),
  specialness: text("specialness"),
  educationalValue: text("educational_value"),
  // レビュー（review_rating/review_count/レビュー本文の閲覧）から読み取れる解釈（すべてINFERENCE）
  childReactionFromReviews: text("child_reaction_from_reviews"),
  safetyEvaluationFromReviews: text("safety_evaluation_from_reviews"),
  guideEvaluationFromReviews: text("guide_evaluation_from_reviews"),
  learningValueFromReviews: text("learning_value_from_reviews"),
  analyzedById: uuid("analyzed_by_id").references(() => users.id),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════════
// PROGRAM（自社プログラム企画）
// ═════════════════════════════════════════════════════════════

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey(),
  regionId: uuid("region_id")
    .notNull()
    .references(() => regions.id),
  organizationId: uuid("organization_id").references(() => organizations.id), // MVPは単一組織だが将来のマルチ組織対応に備えnullable
  title: text("title").notNull(),
  concept: text("concept"),
  targetAudience: text("target_audience"),
  targetAgeMin: integer("target_age_min"),
  targetAgeMax: integer("target_age_max"),
  marketNeeds: text("market_needs"),
  whyChichibu: text("why_chichibu"),
  experienceContent: text("experience_content"),
  inquiryTheme: text("inquiry_theme"),
  participantQuestions: text("participant_questions"),
  seasons: text("seasons").array().notNull().default(sql`'{}'::text[]`),
  durationMinutes: integer("duration_minutes"),
  capacityMin: integer("capacity_min"),
  capacityMax: integer("capacity_max"),
  recommendedPrice: integer("recommended_price"),
  status: programStatusEnum("status").notNull().default("IDEA"),
  factStatus: factStatusEnum("fact_status").notNull().default("IDEA"),
  humanApproved: boolean("human_approved").notNull().default(false),
  generatedBy: text("generated_by"), // "ai" または null（手動作成）
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// プログラムと体験機会の中間テーブル（MVPにおける主要な紐付け）
export const programActivityOpportunities = pgTable(
  "program_activity_opportunities",
  {
    id: uuid("id").primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    activityOpportunityId: uuid("activity_opportunity_id")
      .notNull()
      .references(() => activityOpportunities.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    note: text("note"),
  },
  (t) => [unique().on(t.programId, t.activityOpportunityId)]
);

// プログラムと資源の直接リンク（ACTIVITY_OPPORTUNITY未整理の資源を仮に紐付ける簡易リンク）
export const programResources = pgTable(
  "program_resources",
  {
    id: uuid("id").primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.programId, t.resourceId)]
);

// ═════════════════════════════════════════════════════════════
// ITINERARY / ITINERARY_ITEM（行程表。v1から継承）
// ═════════════════════════════════════════════════════════════

export const itineraries = pgTable("itineraries", {
  id: uuid("id").primaryKey(),
  programId: uuid("program_id")
    .notNull()
    .unique()
    .references(() => programs.id, { onDelete: "cascade" }),
  title: text("title"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itineraryItems = pgTable("itinerary_items", {
  id: uuid("id").primaryKey(),
  itineraryId: uuid("itinerary_id")
    .notNull()
    .references(() => itineraries.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  activity: text("activity").notNull(),
  resourceId: uuid("resource_id").references(() => resources.id),
  staffNote: text("staff_note"),
});

// ═════════════════════════════════════════════════════════════
// MVP実運用テスト用の計測・フィードバック（正式なプロダクト機能ではなく、
// 「人間だけでこのアプリを使った商品開発体験を検証する」ための暫定テーブル。
// 本番の分析基盤に置き換わる想定で、将来Phase2判断後に見直す前提。
// ═════════════════════════════════════════════════════════════

// プログラム作成ウィザードの開始〜保存までの所要時間・STEP別滞在時間を記録する開発用ログ
export const programWizardLogs = pgTable("program_wizard_logs", {
  id: uuid("id").primaryKey(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
  totalSeconds: integer("total_seconds").notNull(),
  // { "1": 秒数, "2": 秒数, ... } の形式でSTEPごとの滞在時間（戻る操作を含め合算）を保持
  stepDurationsJson: text("step_durations_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// MVP-B: AI Product Development Assistant の1回の診断実行を1行として保持する。
// 再診断のたびに新しい行を追加する（上書きしない＝履歴を残す）。
// FACT/INFERENCE/IDEAの原則: このテーブルにはAIが生成したINFERENCE/IDEAのみを保持し、
// FACTはprograms/resources/resource_relationships/activity_opportunities/market_programsの
// 既存テーブルからのみ参照する。AIはこのテーブル以外への書き込みを行わない。
export const programAiReviews = pgTable("program_ai_reviews", {
  id: uuid("id").primaryKey(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),

  // Claude API 呼び出し1回目の結果（診断・不足FACT・市場比較）。DiagnosisResponse型。
  diagnosis: jsonb("diagnosis"),
  // MissingResearchItem[]型。各項目はresolved情報を内部に持つ（解決済みでも履歴として残す）。
  missingResearch: jsonb("missing_research"),
  marketComparison: jsonb("market_comparison"),

  // Claude API 呼び出し2回目の結果（改善アイデア）。ImprovementIdea[]型。
  improvementIdeas: jsonb("improvement_ideas"),

  // 人間による選択・承認（AI呼び出しなし）
  approvedIdeaIds: text("approved_idea_ids").array().notNull().default(sql`'{}'::text[]`),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedById: uuid("approved_by_id").references(() => users.id),

  // Claude API 呼び出し3回目の結果（Product Draft）。ProductDraft型（構造化データを保持し続ける）。
  productDraft: jsonb("product_draft"),
  // Product Draftの各セクションのうちPROGRAM本体へ採用したセクション名の配列（履歴・監査用）
  adoptedSections: text("adopted_sections").array().notNull().default(sql`'{}'::text[]`),
  adoptedAt: timestamp("adopted_at", { withTimezone: true }),
  adoptedById: uuid("adopted_by_id").references(() => users.id),

  model: text("model"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 企画作成後の簡易テストフィードバック（使いやすさ評価＋自由記述）
export const programFeedback = pgTable("program_feedback", {
  id: uuid("id").primaryKey(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  easeRating: easeRatingEnum("ease_rating").notNull(),
  // 「このアプリを使わなかった場合、この企画を思いつけたと思いますか？」（Research Sprint 01より追加）
  ideationCounterfactual: ideationCounterfactualEnum("ideation_counterfactual").notNull(),
  confusionPoints: text("confusion_points"),
  missingInfo: text("missing_info"),
  unnecessaryInfo: text("unnecessary_info"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
