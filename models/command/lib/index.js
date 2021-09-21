'use strict';

/**
 * 命令初始化统一封装
 * 统一处理参数，初始化，执行 方法
 */

const semver = require('semver');

const colors = require('colors/safe');

const log = require('@bourne-cli-dev/log');

// const { isObject } = require('@bourne-cli-dev/utils');

const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(argv) {
    // console.log('command constructor', argv);
    if (!argv) {
      throw new Error('参数不能为空');
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组');
    }
    if (!argv.length) {
      throw new Error('参数列表不能为空');
    }

    this._argv = argv;

    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgvs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());

      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }

  // 检查node版本号
  checkNodeVersion() {
    // 1.获取版本号
    const currentVersion = process.version;
    // 2.比对最低的版本号
    const lowest = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowest)) {
      throw new Error(colors.red(`bourne-cli 需要${lowest}以上的版本`));
    }
  }

  // 初始化参数
  initArgvs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
    // console.log(this.cmd, this._argv);
  }

  // 准备阶段
  init() {
    throw new Error('init 必须实现');
  }

  exec() {
    throw new Error('exec 必须实现');
  }
}

module.exports = Command;
