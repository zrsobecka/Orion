# Repository feature analysis

## User outcome

Orion can inspect a registered repository and propose missing user-visible features without
changing the feature map automatically. The builder reviews the evidence, rejects unwanted
items, and explicitly accepts the rest.

## Flow

1. `Scan repository` reads a compact bootstrap sample of tracked and non-ignored text files. It
   lists at most 15 high-signal paths, reads short excerpts from at most two or three files, and
   asks for at most three initial proposals so local 12B models remain usable.
2. Orion excludes secrets, environment files, databases, binaries, generated output, and
   dependency folders.
3. The projects feature sends repository context and existing feature names to LM Studio.
4. LM Studio returns structured proposals with a status, confidence, and repository paths.
5. Orion drops duplicates, invalid values, and proposals without a real scanned evidence path.
6. The builder selects proposals and saves them in one SQLite transaction. Accepted entries use
   the neutral `later` horizon because repository evidence does not establish product priority.

## Failure and recovery

- A stopped LM Studio server, missing model, timeout, or invalid structured response leaves the
  current feature map unchanged and exposes `Retry`.
- Closing the review discards proposals because only accepted features are durable.
- Existing features are never overwritten or removed by repository analysis.
- The scan is deliberately a bootstrap, so rerunning it after the repository evolves may reveal
  additional capabilities; it is not intended to exhaustively reconstruct the whole product.

## Deliberate boundary

This feature only discovers feature inventory. It does not evaluate the overall application,
user flow, usability, product quality, or overview health. Those later workflows should reuse the
shared LM Studio integration with their own context, schema, and acceptance rules.
