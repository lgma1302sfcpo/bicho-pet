import { spawn } from "node:child_process";

const maximumAttempts = 4;
const retryDelayMilliseconds = 12_000;

function runMigration() {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

  return new Promise((resolve) => {
    const migration = spawn(
      npmExecutable,
      ["exec", "--", "prisma", "migrate", "deploy"],
      {
        env: process.env,
        stdio: "inherit",
      },
    );

    migration.once("error", (error) => {
      console.error("Nao foi possivel iniciar as migracoes do banco de dados.", error);
      resolve(1);
    });

    migration.once("exit", (code) => resolve(code ?? 1));
  });
}

for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
  const exitCode = await runMigration();

  if (exitCode === 0) {
    process.exit(0);
  }

  if (attempt === maximumAttempts) {
    console.error(
      `As migracoes falharam depois de ${maximumAttempts} tentativas. O build sera interrompido para proteger o banco de dados.`,
    );
    process.exit(exitCode);
  }

  console.warn(
    `Tentativa ${attempt} de ${maximumAttempts} falhou. Uma nova tentativa sera feita em ${retryDelayMilliseconds / 1_000} segundos.`,
  );

  await new Promise((resolve) => setTimeout(resolve, retryDelayMilliseconds));
}
