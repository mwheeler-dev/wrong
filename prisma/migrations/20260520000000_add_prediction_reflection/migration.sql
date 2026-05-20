-- CreateTable
CREATE TABLE "PredictionReflection" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "reasoning" JSONB NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PredictionReflection_predictionId_key" ON "PredictionReflection"("predictionId");

-- AddForeignKey
ALTER TABLE "PredictionReflection" ADD CONSTRAINT "PredictionReflection_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
