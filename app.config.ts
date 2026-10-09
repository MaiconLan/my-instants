import type { ExpoConfig } from "expo/config";

import pkg from "./package.json";

/**
 * Wraps the static `app.json`. The version is never typed by hand: it comes from
 * `package.json`, which only `changeset version` writes. `MYINSTANTS_BUILD_LABEL` is set
 * by the RC workflow so a PR build says `RC.AAAAMMDD.NNN` instead of the last release.
 * It only reaches `extra.appVersion` (shown in Ajustes); the native versionName stays
 * the semver.
 */
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  name: config.name ?? "My Instants",
  slug: config.slug ?? "my-instants",
  version: pkg.version,
  extra: {
    ...config.extra,
    appVersion: process.env.MYINSTANTS_BUILD_LABEL ?? pkg.version,
  },
});
