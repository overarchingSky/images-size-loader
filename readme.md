[![npm](https://img.shields.io/npm/v/images-size-loader.svg)](https://www.npmjs.com/package/images-size-loader)

## images-size-loader for vue.js

an webpack loader for vue.js which can calculate the size of `<img>`'s src and add width and height as it's attribute.

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

html:

添加 loading 属性，开启 loading 加载动画：<img loading src="****.png" />

添加 size-loading 属性，开启 loading 加载动画并自动读取图片尺寸：<img size-loading src="****.png" />
```

### example

before resolve:

```
<img
:src="require('images/b.gif')"
:srcset="require('images/b.gif') + ' 1x,'
+ require('images/logo.png') + ' 2x,'
+ require('images/a.gif') + ' 3x'"
sizes="(min-width:520px) 500px, 100%" alt="" />
```

after resolve:

```
<img
width=300 height=400
:src="require('images/b.gif')"
:srcset="require('images/b.gif') + ' 1x,'
+ require('images/logo.png') + ' 2x,'
+ require('images/a.gif') + ' 3x'"
sizes="(min-width:520px) 500px, 100%" alt="" />
```

### notices

the calculation of size is not According to the `<img>`'s srcset, but src, because that we don't know which one of image specificed is expected as the calculation image.So, if your `<img>` contains srcset, please point out one of them as src's value.\
In addition, once handled by images-size-loader, an special class named `_images-size-loader-loading` will be add on `<img>` , and when the `<img>`'s src loaded, it will be removed.\
Now, the class `_images-size-loader-loading` will only show a loading image, and it can be customized according to you.
