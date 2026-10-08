export type QuestionRowInput = {
  id: string;
  text: string;
  category: string;
  status: string;
  correctAnswer: string | null;
  publishDate: Date;
  resolutionDate: Date;
  closesToPredictionsAt: Date | null;
  resolutionCriteria: string;
  sourceUrl: string | null;
  _count: { predictions: number };
};

export function toAdminQuestionRow(q: QuestionRowInput) {
  return {
    id: q.id,
    text: q.text,
    category: q.category,
    status: q.status,
    correctAnswer: q.correctAnswer,
    publishDate: q.publishDate.toISOString(),
    resolutionDate: q.resolutionDate.toISOString(),
    closesToPredictionsAt: q.closesToPredictionsAt?.toISOString() ?? null,
    resolutionCriteria: q.resolutionCriteria,
    sourceUrl: q.sourceUrl,
    predictionsCount: q._count.predictions,
  };
}
