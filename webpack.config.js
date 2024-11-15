const path = require("path");
const webpack = require("webpack");
const devConfig = require("./webpack.dev.js");
const prodConfig = require("./webpack.prod.js");
const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const commonConfig = {
  entry: "./src/App.tsx",
  output: {
    path: path.resolve(__dirname, "dist", "client"),
    publicPath: "/",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    modules: ["node_modules", path.resolve(__dirname, "src")],
  },
  stats: {
    errorDetails: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        // Add specific handling for @babel/standalone
        test: /@babel\/standalone/,
        use: {
          loader: "babel-loader",
          options: {
            sourceType: "unambiguous",
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
};

module.exports = (env, argv) => {
  if (argv.mode === "production") {
    return merge(commonConfig, prodConfig, { mode: "production" });
  }
  return merge(commonConfig, devConfig, { mode: "development" });
};
