export async function runIndependentChecks<T, R>(
  items: T[],
  check: (item: T) => Promise<R>,
  onResult: (item: T, outcome: { result: R } | { error: string }) => void,
  shouldStop: () => boolean = () => false,
  concurrency = 2,
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length && !shouldStop()) {
        const item = items[cursor++];
        let outcome: { result: R } | { error: string };
        try {
          outcome = { result: await check(item) };
        } catch (error) {
          outcome = {
            error:
              error instanceof Error
                ? error.message
                : "This question could not be checked.",
          };
        }
        onResult(item, outcome);
      }
    }),
  );
}
