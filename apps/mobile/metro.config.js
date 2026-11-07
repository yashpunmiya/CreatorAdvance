const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');
const expoPackageRoot = fs.realpathSync(path.join(__dirname, 'node_modules/expo'));

// Windows uses a short external pnpm virtual store to keep native build paths
// within CMake's limit. Metro must see the whole store, including transitive
// dependencies, rather than a hand-maintained map of individual packages.
if (!expoPackageRoot.startsWith(`${workspaceRoot}${path.sep}`)) {
  const virtualStoreRoot = path.resolve(expoPackageRoot, '../../..');
  config.watchFolders = [...new Set([...config.watchFolders, virtualStoreRoot])];
}

module.exports = config;
