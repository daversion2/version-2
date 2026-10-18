# meditation-core: a copy, don't edit

These `.ts` files are copied from `src/utils/meditation/` by
`npm --prefix functions run sync-core`, which also runs before every functions
deploy (firebase.json predeploy). Edit the originals, then run the sync.
A jest test (`src/utils/meditation/__tests__/sync.test.ts`) fails if the
copies drift.
