// End-to-end config: runs the app's real data layer against the LOCAL Supabase stack.
// Requires `pnpm db:start` and `pnpm functions:serve` to be running. Run: pnpm --filter @fmbp/mobile test:e2e
const base = require("./jest.config");
module.exports = {
  ...base,
  setupFiles: [...base.setupFiles, "<rootDir>/e2e/setup.js"],
  testMatch: ["**/e2e/**/*.e2e.test.[jt]s?(x)"],
  testTimeout: 60_000,
  maxWorkers: 1,
};
