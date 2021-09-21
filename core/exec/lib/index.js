'use strict';

const path = require('path');
const cp = require('child_process');
const Package = require('@bourne-cli-dev/package');
const log = require('@bourne-cli-dev/log');
const { execAsync } = require('@bourne-cli-dev/utils');
const spawn = require('cross-spawn');

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

      // 使用node子进程调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];

      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith('_') &&
          key !== 'parent'
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      // require(rootFile).call(null, Array.from(arguments));
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      // 相当于多线程执行node -e "console.log('qwe')"
      const child = spawn('node', ['-e', code], {
        pwd: process.cwd(), // 当前目录
        stdio: 'inherit', // 标准输出方式统一到父进程，不再需求监听stdout stderr
      });
      // child.stdout.on('data', (data) => {
      //   console.log(`stdout: ${data}`);
      // });
      // child.stderr.on('data', (data) => {
      //   console.error(`stderr: ${data}`);
      // });
      child.on('error', (e) => {
        // 监听错误，中断子进程
        console.log('error', e);
        process.exit(1);
      });
      child.on('exit', (e) => {
        log.verbose('子进程 exit with ' + e);
        process.exit(e);
      });
    } catch (error) {
      log.error(error.message);
    }
  }
}

module.exports = exec;
