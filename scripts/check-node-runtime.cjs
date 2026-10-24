// Security baseline: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
const { engines } = require("../package.json");

function assertSupportedNodeRuntime(version = process.versions.node) {
  const minimum = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(engines.node);
  const current = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!minimum) throw new Error("Defina engines.node com a versao minima corrigida: ^MAJOR.MINOR.PATCH.");
  const [major, minor, patch] = minimum.slice(1).map(Number);
  if (!current || Number(current[1]) !== major || Number(current[2]) < minor ||
      (Number(current[2]) === minor && Number(current[3]) < patch)) {
    throw new Error(`Node.js ${version} recusado. Este projeto exige ${engines.node}; atualize o runtime antes de continuar.`);
  }
}

if (require.main === module) {
  try {
    assertSupportedNodeRuntime();
    console.log(`[node-runtime] Node.js ${process.versions.node}; requisito ${engines.node} atendido.`);
  } catch (error) {
    console.error(`[node-runtime] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { assertSupportedNodeRuntime };
