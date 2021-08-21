'use strict';

module.exports = core;
const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const pathExists = require('path-exists');
const minimist = require('minimist');
const dotenv = require('dotenv');
const { homedir } = require('os');

const log = require('@bourne-cli-dev/log');
const pkg = require('../package.json');
const constant = require('./constant');

const userHome = homedir();
let argvs;
// 入口函数
async function core() {
  try {
    checkPkgVersion();
    checknodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
  } catch (error) {
    log.error(error.message);
  }
}

async function checkGlobalUpdate() {
  // 1. 获取当前版本号机模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2.调用npm API,获取所有版本号
  const { getNpmSemverVersion } = require('@bourne-cli-dev/get-npm-info');
  // 3.提取所有版本号，比对哪些版本号是大于当前版本号
  getNpmSemverVersion(currentVersion, npmName);
  // 4.获取最新的版本号，提示用户更新到最新版本
}

// 检查环境变量
// 用于储存本地信息
function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultCliConfig();
  log.verbose('环境变量', process.env.CLI_HOME_PATH);
}
function createDefaultCliConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    // cliHome 配置文件路径
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }

  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 检查入参
function checkInputArgs() {
  argvs = minimist(process.argv.slice(2));
  checkArgs();
  log.verbose('debug', 'test debug log');
}

function checkArgs() {
  if (argvs.debug) {
    process.env.LOG_LEVEL = 'verbose';
  } else {
    process.env.LOG_LEVEL = 'info';
  }
  log.level = process.env.LOG_LEVEL;
}

// 获取用户主目录
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('用户主目录不存在！'));
  }
}

// 检查是否是root账户 ，并降级，防止非管理员用户无法操作访问 生成的文件
function checkRoot() {
  const rootCheck = require('root-check');
  // console.log("root账户处理前：" + process.geteuid());
  rootCheck();
  // console.log("root账户处理后：" + process.geteuid());
}

// 检查脚手架版本号
function checkPkgVersion() {
  // log.info('', `bourne-cli版本: ${pkg.version}`);
}

// 检查node版本号
function checknodeVersion() {
  // 1.获取版本号
  const currentVersion = process.version;
  // 2.比对最低的版本号
  const lowest = constant.LOWEST_NODE_VERSION;
  if (!semver.gte(currentVersion, lowest)) {
    throw new Error(colors.red(`bourne-cli 需要${lowest}以上的版本`));
  }
}
