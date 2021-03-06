"use strict";
var chalk = require("chalk");
var sizeOf = require("image-size");
var style = require("./style");
var url = require("url");
var http = require("http");
var path = require("path");

function isNeedHandle(str) {
	//满足一下两个条件才予以处理
	//1.img标签必须存在loading或size-loading属性之一，
	//2.没有设置widht或height中的任何一个属性
	//3.src有值
	return (
		/loading/.test(str) &&
		!/\s(width|height)=/.test(str) &&
		/src=\"[^\"]*\.[^\"]*\"/.test(str)
	);
}

function onlyAddLoading(str) {
	return /loading/.test(str) && !/size-loading/.test(str);
}

function getHttpImage(httpUrl, callback) {
	var options = url.parse(httpUrl);
	http.get(options, function(response) {
		var chunks = [];
		response
			.on("data", function(chunk) {
				chunks.push(chunk);
			})
			.on("end", function() {
				var buffer = Buffer.concat(chunks);
				callback && callback(buffer);
			});
	});
}

function isRelativePath(path) {
	return /^\.{1,2}\//.test(path);
}

function getImageSourcePath(imgStr, callback) {
	if (!callback) {
		throw `callback must be defined`;
	}
	let sourcePath = imgStr.match(/src="([^"]*)"/);
	if (!sourcePath || !sourcePath[1]) {
		return callback(null);
	}
	sourcePath = sourcePath[1];
	if (/(http(s)?:)?\/\//.test(sourcePath)) {
		//if cdn or http(s)://***
		return getHttpImage(sourcePath, function(image) {
			callback(image);
		});
	} else if (!/require/.test(sourcePath)) {
		if (isRelativePath(sourcePath)) {
			return callback(path.resolve(this.resourcePath, "../", sourcePath));
		}
		return callback(process.cwd() + sourcePath);
	}
	//从require('***.png')中取出路径部分
	sourcePath = sourcePath
		? sourcePath
				.replace(
					/require\(["']([^\",^\(,^\)]*\.[^\",^\(,^\)]*)["']\)/g,
					"$1"
				)
				.trim()
		: null;
	if (isRelativePath(sourcePath)) {
		sourcePath = path.resolve(this.resourcePath, "../", sourcePath);
	}
	this.resolve(this.context, sourcePath, (a, path, info) => {
		callback(path);
	});
}

function addSize(str, width, height) {
	return str.replace(/\<img/, `<img width="${width}" height="${height}"`);
}

function addClass(str, className) {
	if (/\sclass="[^"]*"/.test(str)) {
		return str.replace(
			/(\<img.*)(\sclass=")([^"]*)(".*)/,
			`$1 onload="javascript:this.classList.remove('${className}')" $2$3 ${className}$4`
		);
	} else {
		return str.replace(
			/\<img/,
			`<img class="${className}" onload="javascript:this.classList.remove('${className}')"`
		);
	}
}

function getSrc(str) {
	return str.match(/src=\"([^\"]*)\"/)[1];
}

function matchImg(str) {
	let shat = str.split(/(-->)|(<!--)/);

	for (let i = 0; i < shat.length; i++) {
		const item = shat[i];
		if (item == "<!--") {
			shat[i] = "";
			shat[i + 1] = "";
			shat[i + 2] = "";
		}
	}
	return shat.join("").match(/\<img[^>]*\>/g) || [];
	//return str.replace(/\<\!--.*--\>/, "").match(/\<img[^>]*\>/g) || [];
}

function generateKey(str, random) {
	return getSrc(str) + "_" + random;
}

function addStyle(str, style) {
	return (
		str +
		`
		<style>
			${style}
		</style>
		`
	);
}

module.exports = function(source) {
	if (this.cacheable) {
		this.cacheable();
	}
	let _this = this;
	var next = _this.async();

	let imageStrs = matchImg(source); // source.match(/\<img[^>]*\>/g) || [];
	imageStrs = imageStrs.filter(item => isNeedHandle(item));
	if (imageStrs.length == 0) {
		next(null, source);
	}
	let taskMamager = {
		task: {},
		create: function(name, callback) {
			this.task[name] = {
				status: "ready",
				payload: null,
				success: function(payload, callback) {
					this.payload = payload;
					this.status = "success";
					callback && callback();
				}
			};
			callback && callback();
		},
		checkAllTaskSuccess: function() {
			let allTaskSuccess = true;
			for (var i in this.task) {
				if (this.task[i].status !== "success") {
					allTaskSuccess = false;
					break;
				}
			}
			return allTaskSuccess;
		}
	};
	//建立任务 create task
	imageStrs.forEach((imageStr, index) => {
		var key = generateKey(imageStr, index);
		taskMamager.create(key, _ => {
			if (onlyAddLoading(imageStr)) {
				//只添加loading
				taskMamager.task[key].success(
					addClass(imageStr, "_images-size-loader-loading"),
					_ => {
						source = source.replace(/\<img[^>]*\>/g, img => {
							if (generateKey(img, index) == key) {
								return isNeedHandle(img)
									? taskMamager.task[key].payload
									: img;
							}
							return img;
						});
						if (taskMamager.checkAllTaskSuccess()) {
							source = addStyle(source, style);
							next(null, source);
						}
					}
				);
			} else {
				//添加loading和宽高属性
				getImageSourcePath.call(_this, imageStr, path => {
					if (!path) {
						console.log(
							chalk.red(`
							failed to resolve the image path:\n
							in ${imageStr}\n
							to make sure that the images exist!
						`)
						);
					}
					let { width, height } = sizeOf(path); //读取图片，返回图片信息
					taskMamager.task[key].success(
						addClass(
							addSize(imageStr, width, height),
							"_images-size-loader-loading"
						),
						_ => {
							source = source.replace(/\<img[^>]*\>/g, img => {
								if (generateKey(img, index) == key) {
									return isNeedHandle(img)
										? taskMamager.task[key].payload
										: img;
								}
								return img;
							});
							if (taskMamager.checkAllTaskSuccess()) {
								source = addStyle(source, style);
								next(null, source);
							}
						}
					);
				});
			}
		});
	});
};
