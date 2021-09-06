'use strict';

const Package = require('@bourne-cli-dev/package');
const log = require('@bourne-cli-dev/log');
const path = require('path');

const SETTINGS = {
  // init: '@bourne-cli-dev/init',
  init: 'axios',
};

const CACHE_DIR = 'dependencies';

/**
 * 动态引入init包，不同的项目可以使用，达到通用的效果
 */

// 获取项目信息 exec 默认两个参数
// action((projectName, options, command) => {});
async function exec() {
  // 获取默认的参数信息，获取第二个参数commandObj
  const cmdObj = arguments[arguments.length - 1];
  // console.log(cmdObj.opts());
  const name = cmdObj.name();
  const packageName = SETTINGS[name];
  const packageVersion = 'latest';
  let storeDir;
  let pkg;
  // 是否指定本地调试文件路径
  let targetPath = process.env.CLI_TARGET_PATH;

  const homePath = process.env.CLI_HOME_PATH;
  log.verbose('homePath', homePath);

  // 未指定本地调试文件路径，走缓存路线
  if (!targetPath) {
    // package目标路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);
    // 实例化包管理器，调用对象上方法来处理当前包的版本
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    });

    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package，下载到storeDir目录下
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  // 动态引入初始化包，达到通用的效果
  const rootFile = pkg.getRootFilePath();
  log.verbose('init命令的rootFile文件：', rootFile);

  if (rootFile) {
    try {
      // arguments 长度未知，用apply调用，转换参数格式
      require(rootFile).call(null, Array.from(arguments));
    } catch (error) {
      log.error(error.message);
    }
  }
}

module.exports = exec;
