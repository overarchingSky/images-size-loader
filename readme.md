[![npm](https://img.shields.io/npm/v/images-size-loader.svg)](https://www.npmjs.com/package/images-size-loader)

## images-size-loader for vue.js
#### an webpack loader for vue.js which can add the width and height to <img>

### Usage
```
npm install images-size-loader --save-dev
...

module: {
  ...
  rules: [
        {
          test: /\.vue$/,
          use: [
            {
              loader: "vue-loader",
              options: vueLoaderConfig
            },
            {
              loader: "images-size-loader"
            }
          ]
        },
        ...
```
