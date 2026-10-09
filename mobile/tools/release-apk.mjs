import { execSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Versions the app from its pending changesets and builds an APK from that version.
 *
 * <p>The two halves are one command on purpose. The version the app reports is read
 * from `package.json` by `app.config.ts` and stamped into the build — so a build made
 * without bumping is a build that lies about which one it is, and the whole reason the
 * banner shows a version is to answer "which build is on that phone?".
 *
 * <p>Usage:
 *
 * <pre>
 *   node tools/release-apk.mjs             build on EAS servers
 *   node tools/release-apk.mjs --local     build here, with prebuild + gradle
 *   node tools/release-apk.mjs --rebuild   build again, without touching the version
 *   node tools/release-apk.mjs --no-build  bump and commit only, build elsewhere
 * </pre>
 *
 * <p>The last one is what CI uses: the workflow wants the same two guards and the same
 * commit message, but the build itself is a call to EAS that it makes on its own.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The git repository is the parent folder (mobile/ lives next to supabase/ and design/).
const repo = path.resolve(root, "..");

const args = new Set(process.argv.slice(2));
const buildsHere = args.has("--local");
const skipsVersion = args.has("--rebuild");
const skipsBuild = args.has("--no-build");

main();

function main() {
  if (skipsVersion) {
    say(`Reconstruindo a versão ${currentVersion()}, sem mexer no número.`);
    build();
    return;
  }

  // A dirty tree means the APK would carry a version that matches no commit — you
  // could never get back to the source that produced it.
  if (capture("git status --porcelain") !== "") {
    fail(
      "A árvore tem alterações não commitadas.\n" +
        "  Commite ou descarte antes: o APK precisa corresponder a um commit.",
    );
  }

  const pending = changesets();
  if (pending.length === 0) {
    fail(
      "Nenhum changeset pendente.\n" +
        "  Rode `npm run change` para descrever o que mudou.\n" +
        "  Um APK com a mesma versão do anterior é indistinguível no celular — que é\n" +
        "  exatamente o problema que a versão dinâmica existe para resolver.\n" +
        "  Se você realmente quer reconstruir a mesma versão, use `--rebuild`.",
    );
  }

  const before = currentVersion();
  say(`${pending.length} changeset(s) pendente(s). Subindo a partir de ${before}.`);
  run("npx changeset version");

  const after = currentVersion();
  if (after === before) {
    fail(`O changeset version não alterou a versão (continua ${before}).`);
  }

  run("git add -A", repo);
  run(`git commit -m "chore(release): v${after}"`, repo);
  say(`Versão ${after} commitada.`);

  build();
}

function build() {
  if (skipsBuild) {
    return;
  }

  if (!buildsHere) {
    run("npx eas build --profile preview --platform android");
    return;
  }

  // No APP_VARIANT set here: `app.config.ts` already falls back to `qa`, which is the
  // environment the EAS `preview` profile pins. Both paths produce the same app.
  run("npx expo prebuild --platform android --clean");

  const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  run(`${gradle} assembleRelease`, path.join(root, "android"));

  say("APK em android/app/build/outputs/apk/release/app-release.apk");
}

/** Every pending changeset — the README is documentation, not one of them. */
function changesets() {
  return readdirSync(path.join(root, ".changeset")).filter(
    (name) => name.endsWith(".md") && name !== "README.md",
  );
}

function currentVersion() {
  return JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
}

function capture(command) {
  return execSync(command, { cwd: repo, encoding: "utf8" }).trim();
}

function run(command, cwd = root) {
  say(`› ${command}`);
  const result = spawnSync(command, { cwd, shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    fail(`Falhou: ${command}`);
  }
}

function say(message) {
  console.log(message);
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}
