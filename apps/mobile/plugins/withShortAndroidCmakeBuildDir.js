const {
  withAppBuildGradle,
  withProjectBuildGradle,
} = require("expo/config-plugins");

/** Keep Android's generated CMake/Ninja files under a short Windows path. */
module.exports = function withShortAndroidCmakeBuildDir(config) {
  config = withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (!gradle.includes("CMAKE_OBJECT_PATH_MAX")) {
      gradle = gradle.replace("    defaultConfig {", `    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=240"
            }
        }`);
      config.modResults.contents = gradle;
    }
    if (gradle.includes("buildStagingDirectory")) return config;

    const stagingPath =
      '    externalNativeBuild {\n' +
      '        cmake {\n' +
      '            buildStagingDirectory file(System.getProperty("os.name").toLowerCase().contains("windows") ? "C:/b/app" : "${rootDir}/.cxx")\n' +
      '        }\n' +
      '    }\n';
    const marker = "    signingConfigs {";
    if (!gradle.includes(marker)) {
      throw new Error("Could not find signingConfigs in generated app/build.gradle");
    }

    config.modResults.contents = gradle.replace(marker, `${stagingPath}${marker}`);
    return config;
  });

  return withProjectBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;
    if (gradle.includes("creatoradvance-short-cmake-staging")) return config;

    const block = `\n// creatoradvance-short-cmake-staging: keep native module Ninja paths short on Windows.
subprojects { nativeProject ->
    nativeProject.plugins.withId("com.android.library") {
        if (System.getProperty("os.name").toLowerCase().contains("windows")) {
            def androidExtension = nativeProject.extensions.findByName("android")
            androidExtension.externalNativeBuild.cmake.buildStagingDirectory = rootProject.file("C:/b/" + nativeProject.name)
        }
    }
}
`;

    config.modResults.contents = `${gradle.trimEnd()}${block}`;
    return config;
  });
};
