"use strict";
var chalk = require("chalk");
var sizeOf = require("image-size");
var style = require("./style");

function isNeedHandle(str) {
	//如果img标签上已经存在widht或height中的一个属性（意味着编码人员意图自己控制该图片），或者无正确的src属性值，则不添加宽高
	return !/\s[width,height]=/.test(str) && /src=\"[^\"]*\.[^\"]*\"/.test(str);
}

function getImageSourcePath(imgStr, callback) {
	let sourcePath = imgStr.match(/src="([^"]*)"/);
	if (!/require/.test(sourcePath)) {
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
//WebpackFileManager
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
	return str.replace(
		/(\<style [^\>]*\>)([\s\S]*)(\<\/style\>)/,
		`$1$2${style}$3`
	);
}

module.exports = function(source) {
	if (this.cacheable) {
		this.cacheable();
	}
	let _this = this;
	let imageStrs = source.match(/\<img[^>]*\>/g) || [];
	if (imageStrs.length == 0) {
		return source;
	}
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
	console.log("adding image size...");
	//建立任务
	imageStrs.forEach(imageStr => {
		taskMamager.create(imageStr, function() {
			getImageSourcePath.call(_this, imageStr, path => {
				console.log("+++++++++++me", path);
				let { width, height } = sizeOf(path); //读取图片，返回图片信息
				taskMamager.task[imageStr].success(
					addClass(
						addSize(imageStr, width, height),
						"_images-size-loader-loading"
					),
					function() {
						//console.log("precent...");
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
