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
