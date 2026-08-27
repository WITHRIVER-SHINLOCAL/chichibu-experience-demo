import bcrypt from "bcryptjs";
import { db, client } from "./index";
import {
  users,
  regions,
  sources,
  resources,
  resourceRelationships,
  activityOpportunities,
  platforms,
  marketPrograms,
  marketProgramPrices,
} from "./schema";

// ═════════════════════════════════════════════════════════════
// シードデータ投入（STEP3: ブートストラップ／STEP13: サンプル資源データ）
//
// 資源・出典・関係性・体験機会・市場プログラムはすべて `is_sample: true` で
// 投入する。これがサンプルデータかどうかを判定する正式なフラグであり、
// 一覧・詳細画面のSAMPLEバッジ表示や「サンプルデータ一括削除」機能の
// 判定基準になっている（実運用テスト用の整備、Phase1.5対応）。
// tags（資源・体験機会）や説明文・メモ欄へのサンプル表記は、
// is_sample導入前の可読性補助として引き続き残している。
// ═════════════════════════════════════════════════════════════

const SAMPLE_TAG = "サンプル";
const SAMPLE_NOTE = "※これはシードデータによるサンプルです。実データ投入前の動作確認用に登録されています。";

// `const T`（TS5.0+）で配列リテラルの各要素のリテラル型（enum文字列等）を
// 保持したまま isSample: true を付与する。通常のジェネリクスだと各要素の
// リテラル型がstringに広がってしまい、Drizzleのenumカラムの型と合わなくなるため。
// `const T`で得たリテラル型はネストした配列（seasons等）まで readonly タプルになるため、
// Drizzleの `string[]` 等の期待型に合わせて再帰的にreadonlyを外す。
type DeepWritable<T> = T extends Date
  ? T
  : T extends readonly (infer U)[]
    ? DeepWritable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: DeepWritable<T[K]> }
      : T;

function withSample<const T extends readonly object[]>(
  rows: T
): { -readonly [K in keyof T]: DeepWritable<T[K]> & { isSample: true } } {
  return rows.map((r) => ({ ...r, isSample: true as const })) as never;
}

async function main() {
  console.log("シードデータを投入します...");

  // ── REGION ──
  const existingRegions = await db.select().from(regions);
  if (existingRegions.length === 0) {
    const chichibuAreaId = crypto.randomUUID();
    await db.insert(regions).values({
      id: chichibuAreaId,
      name: "秩父地域",
      slug: "chichibu-area",
      description: "秩父市・横瀬町・皆野町・長瀞町・小鹿野町の5市町からなる広域区分",
    });
    await db.insert(regions).values([
      { id: crypto.randomUUID(), name: "秩父市", slug: "chichibu-city", parentRegionId: chichibuAreaId },
      { id: crypto.randomUUID(), name: "横瀬町", slug: "yokoze", parentRegionId: chichibuAreaId },
      { id: crypto.randomUUID(), name: "皆野町", slug: "minano", parentRegionId: chichibuAreaId },
      { id: crypto.randomUUID(), name: "長瀞町", slug: "nagatoro", parentRegionId: chichibuAreaId },
      { id: crypto.randomUUID(), name: "小鹿野町", slug: "ogano", parentRegionId: chichibuAreaId },
    ]);
    console.log("  REGIONを投入しました（秩父地域＋5市町）。");
  } else {
    console.log("  REGIONは既に存在するためスキップしました。");
  }

  // ── USER ──
  const existingUsers = await db.select().from(users);
  let sato = existingUsers.find((u) => u.email === "sato@withriver.example");
  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash("withriver2026", 10);
    const inserted = await db
      .insert(users)
      .values([
        { id: crypto.randomUUID(), name: "佐藤 花子", email: "sato@withriver.example", passwordHash, role: "admin" },
        { id: crypto.randomUUID(), name: "田中 太郎", email: "tanaka@withriver.example", passwordHash, role: "staff" },
      ])
      .returning();
    sato = inserted[0];
    console.log("  ユーザーを投入しました。");
    console.log("  ログイン用アカウント: sato@withriver.example / withriver2026");
  } else {
    console.log("  ユーザーは既に存在するためスキップしました。");
  }
  if (!sato) throw new Error("シード用ユーザーの取得に失敗しました。");

  // ── サンプル資源データ（既に投入済みならスキップ） ──
  const existingResources = await db.select().from(resources);
  if (existingResources.length > 0) {
    console.log("  地域資源は既に存在するためサンプルデータ投入をスキップしました。");
    return;
  }

  await db.transaction(async (tx) => {
  const regionRows = await tx.select().from(regions);
  const regionBySlug = (slug: string) => {
    const r = regionRows.find((x) => x.slug === slug);
    if (!r) throw new Error(`region not found: ${slug}`);
    return r.id;
  };
  const yokozeId = regionBySlug("yokoze");
  const chichibuCityId = regionBySlug("chichibu-city");

  // ── SOURCE ──
  const [srcCity, srcGeopark, srcChamber, srcShrine] = await tx
    .insert(sources)
    .values(withSample([
      {
        id: crypto.randomUUID(),
        sourceName: "秩父市公式サイト",
        sourceUrl: "https://www.city.chichibu.lg.jp/",
        organization: "秩父市",
        sourceType: "government",
        reliabilityGrade: "A",
        accessedAt: new Date(),
        notes: SAMPLE_NOTE,
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        sourceName: "ジオパーク秩父 公式サイト",
        sourceUrl: "https://www.chichibu-geo.com/",
        organization: "秩父盆地ジオパーク協議会",
        sourceType: "dmo",
        reliabilityGrade: "B",
        accessedAt: new Date(),
        notes: SAMPLE_NOTE,
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        sourceName: "秩父商工会議所 資料",
        organization: "秩父商工会議所",
        sourceType: "industry_association",
        reliabilityGrade: "C",
        accessedAt: new Date(),
        notes: SAMPLE_NOTE,
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        sourceName: "三峯神社 公式サイト",
        sourceUrl: "https://www.mitsuminejinja.or.jp/",
        organization: "三峯神社",
        sourceType: "official_shrine_temple",
        reliabilityGrade: "A",
        accessedAt: new Date(),
        notes: SAMPLE_NOTE,
        createdById: sato.id,
      },
    ]))
    .returning();

  // ── RESOURCE ──
  const resourceRows = await tx
    .insert(resources)
    .values(withSample([
      {
        id: crypto.randomUUID(),
        regionId: yokozeId,
        category: "NATURE",
        name: "荒川（横瀬町周辺）",
        summary: "秩父地域を流れる一級河川。横瀬町周辺は清流と河原が広がり、水辺の生き物観察に適している。",
        seasons: ["summer", "autumn"],
        tags: ["川", "水質", "生き物", SAMPLE_TAG],
        factStatus: "FACT",
        verifiedById: sato.id,
        verifiedAt: new Date(),
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: yokozeId,
        category: "GEOLOGY",
        name: "地層の露頭（ジオパーク秩父エリア）",
        summary: "荒川沿いに見られる地層の露頭。堆積の様子を観察できる。",
        seasons: ["all"],
        tags: ["地質", "ジオパーク", SAMPLE_TAG],
        factStatus: "FACT",
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: yokozeId,
        category: "GEOLOGY",
        name: "武甲山",
        summary: "石灰岩からなる秩父のシンボル的な山。山岳信仰の対象でもある。",
        seasons: ["all"],
        tags: ["地質", "信仰", SAMPLE_TAG],
        factStatus: "FACT",
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: yokozeId,
        category: "GEOLOGY",
        name: "石灰岩（武甲山産）",
        summary: "武甲山を構成する主要な岩石。セメント原料として採掘されている。",
        seasons: ["all"],
        tags: ["地質", SAMPLE_TAG],
        factStatus: "FACT",
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: yokozeId,
        category: "INDUSTRY",
        name: "石灰産業",
        summary: "武甲山の石灰岩を原料とするセメント・石灰製造業。秩父地域の主要産業の一つ。",
        seasons: ["all"],
        tags: ["産業", SAMPLE_TAG],
        factStatus: "INFERENCE",
        confidence: 70,
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: yokozeId,
        category: "CULTURE",
        name: "武甲山の山岳信仰",
        summary: "武甲山を御神体とする信仰。周辺神社の祭礼にも関わりがあるとされる。",
        seasons: ["all"],
        tags: ["信仰", "文化", SAMPLE_TAG],
        factStatus: "INFERENCE",
        confidence: 60,
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: chichibuCityId,
        category: "CULTURE",
        name: "三峯神社",
        summary: "標高1,100mに位置する関東屈指のパワースポット。早朝参拝で知られる。",
        seasons: ["spring", "summer", "autumn"],
        tags: ["神社", "パワースポット", SAMPLE_TAG],
        factStatus: "FACT",
        verifiedById: sato.id,
        verifiedAt: new Date(),
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: chichibuCityId,
        category: "NATURE",
        name: "羊山公園 芝桜の丘",
        summary: "4月中旬〜5月上旬に約40万株の芝桜が咲く絶景スポット。武甲山を背景に望める。",
        seasons: ["spring"],
        tags: ["花", "絶景", SAMPLE_TAG],
        factStatus: "FACT",
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: chichibuCityId,
        category: "CULTURE",
        name: "秩父夜祭 屋台囃子",
        summary: "日本三大曳山祭の一つ、秩父夜祭で使われる屋台囃子。地元保存会が継承している。",
        seasons: ["winter"],
        tags: ["祭り", "伝統文化", SAMPLE_TAG],
        factStatus: "INFERENCE",
        confidence: 65,
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        regionId: chichibuCityId,
        category: "FOOD",
        name: "そば処（秩父市街）",
        summary: "秩父名物の手打ちそばを提供する飲食店。そば打ち体験を受け入れている店舗もある。",
        seasons: ["all"],
        tags: ["そば", "食", SAMPLE_TAG],
        factStatus: "FACT",
        createdById: sato.id,
      },
    ]))
    .returning();

  const byName = (name: string) => {
    const r = resourceRows.find((x) => x.name === name);
    if (!r) throw new Error(`resource not found: ${name}`);
    return r;
  };
  const rArakawa = byName("荒川（横瀬町周辺）");
  const rChisou = byName("地層の露頭（ジオパーク秩父エリア）");
  const rBukou = byName("武甲山");
  const rSekkai = byName("石灰岩（武甲山産）");
  const rSangyo = byName("石灰産業");
  const rShinkou = byName("武甲山の山岳信仰");
  const rMitsumine = byName("三峯神社");
  const rSoba = byName("そば処（秩父市街）");
  // 羊山公園 芝桜の丘・秩父夜祭 屋台囃子は「関係性やACTIVITY_OPPORTUNITYが
  // まだ紐付いていない資源」の例として意図的にそのままにしている（byNameで存在確認のみ）。
  byName("羊山公園 芝桜の丘");
  byName("秩父夜祭 屋台囃子");

  // ── RESOURCE_RELATIONSHIP（武甲山の関係性チェーン例） ──
  await tx.insert(resourceRelationships).values(withSample([
    {
      id: crypto.randomUUID(),
      fromResourceId: rBukou.id,
      toResourceId: rSekkai.id,
      relationshipCategory: "geological",
      relationshipLabel: "を主に構成する岩石は",
      description: "武甲山は石灰岩から成る山として知られる。",
      factStatus: "FACT",
      sourceId: srcGeopark.id,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      fromResourceId: rSekkai.id,
      toResourceId: rSangyo.id,
      relationshipCategory: "economic",
      relationshipLabel: "が原料として利用されている産業は",
      description: "採掘された石灰岩はセメント等の原料として利用される。",
      factStatus: "FACT",
      sourceId: srcChamber.id,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      fromResourceId: rBukou.id,
      toResourceId: rShinkou.id,
      relationshipCategory: "spiritual",
      relationshipLabel: "は古くから信仰の対象になっている（",
      description: "武甲山を御神体とする信仰があるとされる。詳細な出典確認は未了。",
      factStatus: "INFERENCE",
      confidence: 60,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      fromResourceId: rArakawa.id,
      toResourceId: rChisou.id,
      relationshipCategory: "geological",
      relationshipLabel: "沿いに露出していると考えられる地層は",
      description: "荒川沿いの河岸に地層が露出している可能性が高いが、現地確認は未了。",
      factStatus: "INFERENCE",
      confidence: 70,
      createdBy: sato.id,
      humanApproved: true,
    },
  ]));

  // ── ACTIVITY_OPPORTUNITY ──
  await tx.insert(activityOpportunities).values(withSample([
    {
      id: crypto.randomUUID(),
      primaryResourceId: rArakawa.id,
      title: "河原で石を観察できる",
      description: "荒川の河原で石を拾い、上流・下流での丸みの違いなどを観察する。",
      appropriateAgeMin: 8,
      appropriateAgeMax: 12,
      durationMinutesMin: 60,
      durationMinutesMax: 90,
      seasons: ["autumn", "summer"],
      tags: [SAMPLE_TAG],
      factStatus: "INFERENCE",
      confidence: 65,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      primaryResourceId: rArakawa.id,
      title: "水質調査ができる",
      description: "簡易パックテストを使い、荒川の水質（pH・COD等）を調べる。",
      appropriateAgeMin: 9,
      appropriateAgeMax: 15,
      durationMinutesMin: 60,
      durationMinutesMax: 90,
      requiredEquipment: ["水質パックテスト", "長靴"],
      seasons: ["autumn"],
      tags: [SAMPLE_TAG],
      factStatus: "IDEA",
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      primaryResourceId: rArakawa.id,
      title: "水生生物を採集・観察できる",
      description: "網とバットを使い、荒川に生息する水生生物を採集して観察する。",
      appropriateAgeMin: 8,
      appropriateAgeMax: 12,
      durationMinutesMin: 60,
      durationMinutesMax: 120,
      requiredEquipment: ["タモ網", "バット", "長靴"],
      seasons: ["summer", "autumn"],
      tags: [SAMPLE_TAG],
      factStatus: "INFERENCE",
      confidence: 60,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      primaryResourceId: rChisou.id,
      title: "地層の断面を観察できる",
      description: "露頭で地層の重なりを観察し、堆積の歴史を学ぶ。",
      appropriateAgeMin: 9,
      appropriateAgeMax: 15,
      durationMinutesMin: 30,
      durationMinutesMax: 60,
      seasons: ["autumn", "spring"],
      tags: [SAMPLE_TAG],
      factStatus: "IDEA",
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      primaryResourceId: rBukou.id,
      title: "山頂から秩父盆地を一望できる",
      description: "登山を通じて山頂から秩父盆地全体の景観を楽しむ。",
      appropriateAgeMin: 10,
      appropriateAgeMax: 99,
      durationMinutesMin: 180,
      durationMinutesMax: 240,
      requiredGroupSizeMin: 2,
      requiredGroupSizeMax: 15,
      needsGuide: true,
      seasons: ["all"],
      tags: [SAMPLE_TAG],
      factStatus: "INFERENCE",
      confidence: 75,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      primaryResourceId: rMitsumine.id,
      title: "早朝参拝を体験できる",
      description: "澄んだ早朝の空気の中で三峯神社を参拝する。",
      appropriateAgeMin: 6,
      appropriateAgeMax: 99,
      durationMinutesMin: 60,
      durationMinutesMax: 90,
      permissionRequired: false,
      seasons: ["spring", "summer", "autumn"],
      tags: [SAMPLE_TAG],
      factStatus: "FACT",
      sourceId: srcShrine.id,
      fieldCheckedAt: new Date(),
      fieldCheckedById: sato.id,
      createdBy: sato.id,
      humanApproved: true,
    },
    {
      id: crypto.randomUUID(),
      primaryResourceId: rSoba.id,
      title: "そば打ちを体験できる",
      description: "職人指導のもと手打ちそばを体験し、その場で実食する。",
      appropriateAgeMin: 6,
      appropriateAgeMax: 99,
      durationMinutesMin: 90,
      durationMinutesMax: 120,
      seasons: ["all"],
      tags: [SAMPLE_TAG],
      factStatus: "FACT",
      sourceId: srcCity.id,
      fieldCheckedAt: new Date(),
      fieldCheckedById: sato.id,
      createdBy: sato.id,
      humanApproved: true,
    },
  ]));

  // ── PLATFORM / MARKET_PROGRAM / MARKET_PROGRAM_PRICE ──
  // platform（ギフテ！／aini）はサンプルデータ一括削除の対象外（実データでも使う共有マスタのため）。
  // そのため再シード時に既存行と重複しうる。名前で既存を再利用し、なければ作成する。
  const existingPlatforms = await tx.select().from(platforms);
  async function upsertPlatform(name: string) {
    const found = existingPlatforms.find((p) => p.name === name);
    if (found) return found;
    const [created] = await tx.insert(platforms).values({ id: crypto.randomUUID(), name }).returning();
    return created;
  }
  const platGifte = await upsertPlatform("ギフテ！");
  const platAini = await upsertPlatform("aini");

  const [mpDonguri, mpSoba, mpMitsumine] = await tx
    .insert(marketPrograms)
    .values(withSample([
      {
        id: crypto.randomUUID(),
        title: "秋の里山どんぐり拾い自然体験",
        platformId: platGifte.id,
        categoryRaw: "自然体験",
        areaText: "埼玉県横瀬町",
        matchedRegionId: yokozeId,
        targetAgeMin: 6,
        targetAgeMax: 12,
        durationMinutes: 180,
        description: `里山でどんぐりを拾い、木工作をする秋の親子向け体験。${SAMPLE_NOTE}`,
        mainActivities: ["どんぐり拾い", "木工作"],
        sourceId: srcCity.id,
        lastCheckedAt: new Date(),
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        title: "そば打ち親子体験",
        platformId: platAini.id,
        categoryRaw: "食体験",
        areaText: "埼玉県秩父市",
        matchedRegionId: chichibuCityId,
        targetAgeMin: 8,
        targetAgeMax: 15,
        durationMinutes: 120,
        description: `職人指導のもとそばを打ち、実食する親子体験。${SAMPLE_NOTE}`,
        mainActivities: ["そば打ち", "実食"],
        sourceId: srcCity.id,
        lastCheckedAt: new Date(),
        createdById: sato.id,
      },
      {
        id: crypto.randomUUID(),
        title: "三峯神社 早朝参拝ツアー",
        categoryRaw: "文化・パワースポット",
        areaText: "埼玉県秩父市",
        matchedRegionId: chichibuCityId,
        targetAgeMin: 6,
        targetAgeMax: 99,
        durationMinutes: 90,
        description: `早朝の三峯神社を参拝するツアー。${SAMPLE_NOTE}`,
        sourceId: srcShrine.id,
        lastCheckedAt: new Date(),
        createdById: sato.id,
      },
    ]))
    .returning();

  await tx.insert(marketProgramPrices).values([
    { id: crypto.randomUUID(), marketProgramId: mpDonguri.id, priceType: "adult", amount: 6500, unit: "1名あたり", taxIncluded: true },
    { id: crypto.randomUUID(), marketProgramId: mpDonguri.id, priceType: "child", amount: 5000, unit: "1名あたり", taxIncluded: true },
    { id: crypto.randomUUID(), marketProgramId: mpSoba.id, priceType: "family", amount: 12000, unit: "1組（大人2名+子2名まで）", taxIncluded: true, notes: "家族料金。1人あたりは参考換算値を参照。" },
    { id: crypto.randomUUID(), marketProgramId: mpMitsumine.id, priceType: "adult", amount: 3000, unit: "1名あたり", taxIncluded: true },
  ]);

  });
  console.log("  サンプル資源・関係性・体験機会・市場データを投入しました。");
  console.log("シード完了。");
}

main()
  .then(() => client.end({ timeout: 1 }))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
