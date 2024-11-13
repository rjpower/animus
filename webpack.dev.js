module.exports = {
  output: {
    filename: "bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    historyApiFallback: true,
    port: 3001,
    open: true,
    hot: true,
    proxy: [
      {
        context: ["/api", "/static"],
        target: "http://localhost:3000",
        secure: false,
      },
    ],
  },
};
