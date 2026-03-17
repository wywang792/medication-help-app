const DOMAIN = "qiniu.wywang.site";


module.exports = {
	getUploadFileOptions(data = {}) {
		let { 
			cloudPath, // 前端传过来的文件路径
		} = data;
		// 可以在此先判断下此路径是否允许上传等逻辑
		// ...
		
		// 然后获取 extStorageManager 对象实例
		const extStorageManager = uniCloud.getExtStorageManager({
			provider: "qiniu",
			domain: DOMAIN, // 域名地址
		});
		// 最后调用 extStorageManager.getUploadFileOptions
		let uploadFileOptionsRes = extStorageManager.getUploadFileOptions({
			cloudPath: cloudPath,
			allowUpdate: false, // 是否允许覆盖更新，如果返回前端，建议设置false，代表仅新增，不可覆盖
		});
		return uploadFileOptionsRes;
	}
}
