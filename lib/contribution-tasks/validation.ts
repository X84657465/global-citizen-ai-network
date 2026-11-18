export type CreateContributionTaskInput = {
  title: string;
  description: string;
  category: string;
  acceptanceCriteria: string[];
  rewardAmount: number;
  closesAt: string | null;
};

export type CreateContributionTaskParseResult =
  | { ok: true; value: CreateContributionTaskInput }
  | { ok: false };

export function parseCreateContributionTaskInput(
  input: unknown,
  now = Date.now(),
): CreateContributionTaskParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false };

  const body = input as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const rewardAmount = typeof body.rewardAmount === "number" ? body.rewardAmount : Number.NaN;
  const criteria = Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : [];
  const closesAt = body.closesAt === null || body.closesAt === ""
    ? null
    : typeof body.closesAt === "string" ? body.closesAt : "invalid";
  const closesAtTimestamp = closesAt === null ? null : Date.parse(closesAt);

  if (
    title.length < 3 || title.length > 180 ||
    description.length < 20 || description.length > 5000 ||
    category.length < 2 || category.length > 40 ||
    !Number.isFinite(rewardAmount) || rewardAmount < 0 || rewardAmount > 100000 ||
    criteria.length < 1 || criteria.length > 20 ||
    criteria.some(item => typeof item !== "string" || item.trim().length < 3 || item.trim().length > 500) ||
    (closesAt !== null && (closesAt === "invalid" || !Number.isFinite(closesAtTimestamp) || closesAtTimestamp! <= now))
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category,
      acceptanceCriteria: criteria.map(item => (item as string).trim()),
      rewardAmount,
      closesAt,
    },
  };
}
