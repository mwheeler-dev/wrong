import type { Prisma } from "@prisma/client";
import { CATEGORIES, type Category } from "./scoring";

export const ARCHIVE_PAGE_SIZE = 25;
export type ArchiveParams = Record<string, string | string[] | undefined>;

export function archiveFilters(params: ArchiveParams) {
  const single = (key: string) =>
    typeof params[key] === "string" ? String(params[key]) : "";
  const search = single("q").trim().slice(0, 200);
  const category = CATEGORIES.includes(single("category") as Category)
    ? single("category")
    : "";
  const answer = ["YES", "NO"].includes(single("answer"))
    ? single("answer")
    : "";
  const validDate = (key: string) => {
    const value = single(key);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
      ? value
      : "";
  };
  const from = validDate("from");
  const to = validDate("to");
  const rawPage = single("page");
  const page = /^\d+$/.test(rawPage)
    ? Math.max(1, Math.min(1_000_000, Number(rawPage)))
    : 1;
  const where: Prisma.QuestionWhereInput = {
    status: "RESOLVED",
    ...(search
      ? {
          OR: [
            { text: { contains: search, mode: "insensitive" } },
            { resolutionCriteria: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(answer ? { correctAnswer: answer } : {}),
    ...(from || to
      ? {
          resolutionDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to
              ? { lt: new Date(Date.parse(`${to}T00:00:00.000Z`) + 86_400_000) }
              : {}),
          },
        }
      : {}),
  };
  return { search, category, answer, from, to, page, where };
}
