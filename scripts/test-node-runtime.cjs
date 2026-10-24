const assert = require("node:assert/strict");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { assertSupportedNodeRuntime } = require("./check-node-runtime.cjs");
const { scripts } = require("../package.json");

test("rejects runtimes before the October 2026 security fixes and untested major versions", () => {
  for (const version of ["20.20.0", "22.22.0", "22.23.3", "22.23.4-rc.1", "24.22.0", "24.22.1", "26.12.1", "invalid"]) {
    assert.throws(() => assertSupportedNodeRuntime(version), /recusado/);
  }
});

test("accepts the patched release and later stable releases in the tested major", () => {
  for (const version of ["22.23.4", "v22.23.4", "22.23.5", "22.24.0"]) {
    assert.doesNotThrow(() => assertSupportedNodeRuntime(version));
  }
});

test("checks the actual process version and reports it without environment overrides", () => {
  const result = spawnSync(process.execPath, [join(__dirname, "./check-node-runtime.cjs")], {
    encoding: "utf8", env: { ...process.env, NODE_VERSION: "20.0.0" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(process.versions.node));
});

test("installation, development, builds and startup validate Node before running tools or migrations", () => {
  for (const name of ["preinstall", "dev", "build", "vercel-build", "start"]) {
    if (scripts[name]) assert.ok(scripts[name].startsWith("node scripts/check-node-runtime.cjs"), name);
  }
});
