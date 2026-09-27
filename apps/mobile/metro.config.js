const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// npm hoists react-native to the repo root, where `react` would resolve to the web app's
// newer copy. React Native needs the exact React it was built against, so pin it here.
const PINNED = new Set(['react', 'react-dom']);
const appOrigin = path.join(__dirname, 'package.json');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (PINNED.has(moduleName.split('/')[0])) {
    return context.resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
