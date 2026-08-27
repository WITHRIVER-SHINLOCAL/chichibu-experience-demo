// MVP-B: program_ai_reviewsの読み取り・型変換ヘルパー（AI呼び出しなし）。
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { programAiReviews } from "@/db/schema";
import type {
  DiagnosisItem,
  ImprovementIdea,
  MarketComparison,
  MissingResearchItem,
  ProductDraft,
} from "@/lib/ai-review/types";

export type AiReviewRow = {
  id: string;
  programId: string;
  diagnosis: DiagnosisItem[] | null;
  missingResearch: MissingResearchItem[] | null;
  marketComparison: MarketComparison | null;
  improvementIdeas: ImprovementIdea[] | null;
  approvedIdeaIds: string[];
  approvedAt: Date | null;
  approvedById: string | null;
  productDraft: ProductDraft | null;
  adoptedSections: string[];
  adoptedAt: Date | null;
  adoptedById: string | null;
  model: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RawRow = typeof programAiReviews.$inferSelect;

function toAiReviewRow(row: RawRow): AiReviewRow {
  return {
    id: row.id,
    programId: row.programId,
    diagnosis: (row.diagnosis as DiagnosisItem[] | null) ?? null,
    missingResearch: (row.missingResearch as MissingResearchItem[] | null) ?? null,
    marketComparison: (row.marketComparison as MarketComparison | null) ?? null,
    improvementIdeas: (row.improvementIdeas as ImprovementIdea[] | null) ?? null,
    approvedIdeaIds: row.approvedIdeaIds,
    approvedAt: row.approvedAt,
    approvedById: row.approvedById,
    productDraft: (row.productDraft as ProductDraft | null) ?? null,
    adoptedSections: row.adoptedSections,
    adoptedAt: row.adoptedAt,
    adoptedById: row.adoptedById,
    model: row.model,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getLatestAiReview(programId: string): Promise<AiReviewRow | null> {
  const [row] = await db
    .select()
    .from(programAiReviews)
    .where(eq(programAiReviews.programId, programId))
    .orderBy(desc(programAiReviews.createdAt))
    .limit(1);
  return row ? toAiReviewRow(row) : null;
}

export async function getAiReviewById(reviewId: string): Promise<AiReviewRow | null> {
  const [row] = await db.select().from(programAiReviews).where(eq(programAiReviews.id, reviewId)).limit(1);
  return row ? toAiReviewRow(row) : null;
}
