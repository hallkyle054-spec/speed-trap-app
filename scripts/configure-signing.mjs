/**
 * Points the release build at a real keystore.
 *
 * The generated project signs release builds with the debug keystore, which is
 * the well-known one shipped in the React Native template — its private key is
 * public, so the signature proves nothing and anyone could sign an "update" to
 * this app that Android would accept. Fine for a throwaway build, not for one
 * handed to other people.
 *
 * Passwords come from the environment at build time and are never written to
 * disk. If the keystore secrets are absent the script exits without touching
 * anything, so builds keep working — but it says so loudly, because a release
 * APK quietly signed with the public debug key is exactly the thing to notice.
 */

import { readFile, writeFile } from 'node:fs/promises';

const GRADLE = 'android/app/build.gradle';

const RELEASE_CONFIG = `
        release {
            storeFile file(System.getenv("VERGE_STORE_FILE") ?: "release.keystore")
            storePassword System.getenv("VERGE_STORE_PASSWORD")
            keyAlias System.getenv("VERGE_KEY_ALIAS")
            keyPassword System.getenv("VERGE_KEY_PASSWORD")
        }
`;

/** Replaces the signingConfig inside the release buildType only. */
function pointReleaseAtReleaseConfig(gradle) {
  const buildTypes = gradle.indexOf('buildTypes {');
  if (buildTypes === -1) return null;

  const release = gradle.indexOf('release {', buildTypes);
  if (release === -1) return null;

  const target = 'signingConfig signingConfigs.debug';
  const at = gradle.indexOf(target, release);
  if (at === -1) return null;

  return gradle.slice(0, at) + 'signingConfig signingConfigs.release' + gradle.slice(at + target.length);
}

const required = ['VERGE_STORE_PASSWORD', 'VERGE_KEY_ALIAS', 'VERGE_KEY_PASSWORD'];
const missing = required.filter(k => !process.env[k]);

if (missing.length) {
  console.log(
    `::warning title=Release signing not configured::` +
      `Missing ${missing.join(', ')}. The APK will be signed with the PUBLIC debug keystore, ` +
      `whose private key ships in the React Native template. Fine for your own phone; not fit ` +
      `for giving to anyone else. See the README's "Signing" section.`,
  );
  process.exit(0);
}

const gradle = await readFile(GRADLE, 'utf8');

if (gradle.includes('signingConfigs.release')) {
  console.log('release signing already configured');
  process.exit(0);
}

if (!gradle.includes('signingConfigs {')) {
  console.error(`${GRADLE} has no signingConfigs block — the template has changed.`);
  process.exit(1);
}

let next = gradle.replace('signingConfigs {', `signingConfigs {${RELEASE_CONFIG}`);
next = pointReleaseAtReleaseConfig(next);

if (!next) {
  console.error(
    'Could not point the release buildType at the release signingConfig. ' +
      'Refusing to continue: the build would silently ship debug-signed.',
  );
  process.exit(1);
}

await writeFile(GRADLE, next);
console.log('release signing configured');
