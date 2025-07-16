// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path'); // Import path module

const config = getDefaultConfig(__dirname);

// Add 'cjs' and 'mjs' to the sourceExts
config.resolver.sourceExts.push('cjs', 'mjs');

// Crucial for Firebase v9+ module resolution issues in React Native
config.resolver.unstable_enablePackageExports = false;

// If you have a monorepo setup, you might need to uncomment and adjust this:
// config.resolver.nodeModulesPaths = [
//   path.resolve(__dirname, 'node_modules'),
//   path.resolve(__dirname, '../../node_modules'), // Adjust based on your monorepo structure
// ];

// Potentially needed for some versions, though less common now with newer Expo SDKs
// config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
// config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');


module.exports = config;