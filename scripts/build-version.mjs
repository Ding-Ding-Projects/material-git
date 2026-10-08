/** Release versions must increase across successful workflow runs and reruns. */
export function resolveBuildVersion(manifestVersion, environment = process.env) {
  const version = environment.MATERIAL_GIT_BUILD_VERSION ?? manifestVersion;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Invalid build version ${JSON.stringify(version)}: expected three nonnegative integers without leading zeros.`);
  }
  // Squirrel.Windows uses System.Version, whose components must fit signed Int32.
  if (version.split('.').some(part => !Number.isSafeInteger(Number(part)) || Number(part) > 2147483647)) {
    throw new Error('Build version exceeds the Squirrel.Windows version component limit.');
  }
  return version;
}
