const path = require("path");
const { NODE_ENV = "production" } = process.env;
const nodeExternals = require("webpack-node-externals");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  entry: "./src/index.ts",
  mode: NODE_ENV,
  target: "node",
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "../app/build/", to: "./build/" },
        { from: "./package.json", to: "./package.json" },
        { from: "./package-lock.json", to: "./package-lock.json" },
      ],
    }),
    new CleanWebpackPlugin(),
  ],
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "index.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ["ts-loader"],
      },
    ],
  },
  externals: [nodeExternals()],
};
