import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import rspack from '@rspack/core';

const require = createRequire(import.meta.url);
const { version: reactVersion } = require('react/package.json');
const { version: reactDomVersion } = require('react-dom/package.json');

/**
 * React is the one module that genuinely breaks when duplicated: two copies mean two dispatchers,
 * and hooks throw. Everything else in this repo is either stateless or injected by the host
 * (see docs/project/decisions/0004-transport-between-remotes.md), so nothing else needs to be a
 * singleton.
 *
 * `eager: false` everywhere, which is why every app's entry is a one-line async boundary into
 * `./bootstrap`: shared modules have to be negotiated before any of them is touched.
 */
function sharedDependencies() {
  return {
    react: { singleton: true, requiredVersion: reactVersion, eager: false },
    'react-dom': { singleton: true, requiredVersion: reactDomVersion, eager: false },
    'react-dom/client': { singleton: true, requiredVersion: reactDomVersion, eager: false },
    'react/jsx-runtime': { singleton: true, requiredVersion: reactVersion, eager: false },
  };
}

/**
 * @param {object} options
 * @param {string} options.appDirectory      absolute path to the app package
 * @param {string} options.name              federation name; must be a valid identifier
 * @param {number} options.port              dev-server port
 * @param {string} [options.title]           document title
 * @param {Record<string, string>} [options.exposes]  set for remotes, omitted for the host
 * @param {Array<object>} [options.proxy]    dev-server proxy rules
 * @returns {import('@rspack/core').Configuration}
 */
export function createFrontendConfig({ appDirectory, name, port, title, exposes, proxy }) {
  const isRemote = Boolean(exposes);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    context: appDirectory,
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    entry: { standalone: './src/index.ts' },
    output: {
      // Chunks resolve relative to wherever the entry was fetched from, so a remote works at any
      // path the container happens to serve it under.
      publicPath: 'auto',
      path: resolve(appDirectory, 'dist'),
      clean: true,
      uniqueName: name,
      filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    experiments: { css: true },
    module: {
      rules: [
        // Rspack has native CSS support; this rule opts the app's own stylesheets into it.
        { test: /\.css$/, type: 'css/auto' },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic', development: !isProduction } },
              target: 'es2022',
            },
          },
        },
      ],
    },
    plugins: [
      new ModuleFederationPlugin({
        name,
        // The host is built with no remotes at all. It learns about them from /config.json at
        // runtime and calls registerRemotes() — never from this file.
        ...(isRemote ? { filename: 'remoteEntry.js', exposes } : { remotes: {} }),
        manifest: true,
        shared: sharedDependencies(),
      }),
      new rspack.HtmlRspackPlugin({
        template: resolve(appDirectory, 'public/index.html'),
        chunks: ['standalone'],
        title: title ?? name,
      }),
      // Everything else in public/ ships as-is. For the shell that includes config.json, which the
      // container's entrypoint overwrites from environment variables before nginx starts.
      new rspack.CopyRspackPlugin({
        patterns: [
          {
            from: resolve(appDirectory, 'public'),
            to: resolve(appDirectory, 'dist'),
            globOptions: { ignore: ['**/index.html'] },
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    optimization: {
      // Splitting the runtime out of a federated entry breaks the container contract.
      runtimeChunk: false,
    },
    devServer: {
      port,
      host: '0.0.0.0',
      historyApiFallback: true,
      hot: true,
      static: { directory: resolve(appDirectory, 'public') },
      headers: { 'Access-Control-Allow-Origin': '*' },
      ...(proxy ? { proxy } : {}),
    },
    stats: 'errors-warnings',
    infrastructureLogging: { level: 'error' },
  };
}

/** Convenience for an app's `rspack.config.mjs`, which knows its own directory. */
export function appDirectoryOf(importMetaUrl) {
  return dirname(new URL(importMetaUrl).pathname);
}
