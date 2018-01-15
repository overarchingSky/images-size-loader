"use strict";
var chalk = require("chalk");
var sizeOf = require("image-size");
var style = require("./style");
var url = require("url");
var http = require("http");

function isNeedHandle(str) {
	//如果img标签上已经存在widht或height中的一个属性（意味着编码人员意图自己控制该图片），或者无正确的src属性值，则跳过，不予处理
	return !/\s(width|height)=/.test(str) && /src=\"[^\"]*\.[^\"]*\"/.test(str);
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

function getImageSourcePath(imgStr, callback) {
	let sourcePath = imgStr.match(/src="([^"]*)"/);
	if (/(http(s)?:)?\/\//.test(sourcePath)) {
		//if cdn or http(s)://***
		return getHttpImage(sourcePath[1], function(image) {
			callback && callback(image);
		});
	} else if (!/require/.test(sourcePath)) {
		return callback && callback(process.cwd() + sourcePath[1]);
	}
	sourcePath = sourcePath
		? sourcePath[1]
				.replace(
					/require\(["']([^\",^\(,^\)]*\.[^\",^\(,^\)]*)["']\)/g,
					"$1"
				)
				.trim()
		: null;
	this.resolve(this.context, sourcePath, (a, path, info) => {
		callback && callback(path);
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
	let imageStrs = source.match(/\<img[^>]*\>/g) || [];
	imageStrs = imageStrs.filter(imageStr => {
		return isNeedHandle(imageStr);
	});
	if (imageStrs.length == 0) {
		return source;
	}
	var next = _this.async();
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
	imageStrs.forEach(imageStr => {
		taskMamager.create(imageStr, function() {
			getImageSourcePath.call(_this, imageStr, path => {
				let { width, height } = sizeOf(path); //读取图片，返回图片信息
				taskMamager.task[imageStr].success(
					addClass(
						addSize(imageStr, width, height),
						"_images-size-loader-loading"
					),
					function() {
						if (taskMamager.checkAllTaskSuccess()) {
							source = addStyle(
								source.replace(
									/\<img[^>]*\>/g,
									img => taskMamager.task[img].payload
								),
								style
							);
							next(null, source);
						}
					}
				);
			});
		});
	});
};
