const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const path = require('path')

module.exports = {
  entry: {
    PushDropTokenator: './src/PushDropTokenator.js'
  },
  output: {
    globalObject: 'this',
    library: ['PushDropTokenator'],
    libraryTarget: 'umd',
    filename: '[name].bundle.js'
  },
  plugins: [
    new NodePolyfillPlugin()
  ],
  externals: {
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      '@babbage/wrapped-sdk': path.resolve(__dirname, 'node_modules/@babbage/wrapped-sdk'),
      'babbage-bsv': path.resolve(__dirname, 'node_modules/babbage-bsv'),
      'safe-buffer': path.resolve(__dirname, 'node_modules/safe-buffer'),
      'bn.js': path.resolve(__dirname, 'node_modules/bn.js'),
      'authrite-js': path.resolve(__dirname, 'node_modules/authrite-js')
    }
  }
}
