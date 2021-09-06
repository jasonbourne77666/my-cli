'use strict';

const path = require('path');
const fse = require('fs-extra');
const npminstall = require('npminstall');
const pathExists = require('path-exists');
const pkgDir = require('pkg-dir').sync;
const { isObject } = require('@bourne-cli-dev/utils');
const formatPath = require('@bourne-cli-dev/format-path');
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require('@bourne-cli-dev/get-npm-info');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package类的options参数不能为空');
    }
    if (!isObject(options)) {
      throw new Error('Package类的options参数必须为对象');
    }

    // package目标路径
    this.targetPath = options.targetPath;
    // // package缓存路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的版本
    this.packageVersion = options.packageVersion;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = options.packageName.replace(/\\/g, '_');
  }

  // 转换包的版本，查看远程是否有最新的版本
  async prepare() {
    // 解决缓存目录不存在的问题，生成目录
    if (this.storeDir && !pathExists.sync(this.storeDir)) {
      // 当前路径的所有文件夹都创建
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
    // console.log(this.packageName, this.packageVersion);
  }

  get cacheFilePath() {
    // 缓存的包的名称
    // eg：@norman-cli-dev
    // 缓存包的目录格式 _@norman-cli-dev_core@1.0.4@@norman-cli-dev
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  // 判断当前package是否存在缓存文件
  async exists() {
    // 走缓存路径
    if (this.storeDir) {
      await this.prepare();
      // console.log('cacheFilePath', this.cacheFilePath);
      return await pathExists(this.cacheFilePath);
    } else {
      return await pathExists(this.targetPath);
    }
  }

  // 安装Package，下载到storeDir目录下
  async install() {
    // 使用npminstall库
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }

  // 更新Package
  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }
  async update() {
    // console.log('判断是否需要更新package');
    await this.prepare();
    // 1. 获取最新版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3. 如果不存在，则直接安装最新版本
    if (!pathExists.sync(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{ name: this.packageName, version: this.latestPackageVersion }],
      });
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1.获取package.json所在目录，使用pkg-dir包
      const dir = pkgDir(targetPath);
      // 2.读取package.json => require()
      if (dir) {
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // 3.找到main/lib - path
        if (pkgFile && pkgFile.main) {
          // 4.路径兼容,win macOs
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }

    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      // 不使用缓存;
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
