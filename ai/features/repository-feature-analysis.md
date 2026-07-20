# Repository feature analysis

## User outcome

Orion inspects a registered repository and proposes missing user-visible features. The builder reviews the evidence and explicitly accepts selected items; scanning never changes the feature map.

## Flow

1. `Scan repository` samples tracked, non-ignored text: at most 15 high-signal paths, excerpts from two or three files, and three initial proposals so local 12B models remain usable.
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
- The bootstrap scan is deliberately non-exhaustive; rerunning it after the repository evolves may reveal more capabilities.

## Deliberate boundary

This feature only discovers feature inventory. It does not evaluate the overall application,
user flow, usability, product quality, or overview health. Those later workflows should reuse the
shared LM Studio integration with their own context, schema, and acceptance rules.
