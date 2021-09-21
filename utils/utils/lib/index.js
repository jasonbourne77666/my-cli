'use strict';

const spawn = require('cross-spawn'); // 兼容windows中运行 cp.spawn

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

/**
 * loading效果
 * @param {*} msg 文字
 * @param {*} spinnerString 符号
 * @returns return对象，用于结束
 */
function spinnerStart(msg = 'loading..', spinnerString = '|/-\\') {
  const CliSpinner = require('cli-spinner').Spinner;
  const spinner = new CliSpinner(msg + ' %s');
  spinner.setSpinnerString(spinnerString);
  spinner.start();

  return spinner;
}

/**
 * 延时
 * @param {*} timeout
 * @returns
 */
function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * 封装子进程方法
 * @param {*} command
 * @param {*} args
 * @param {*} options
 */
function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on('error', (e) => {
      // 监听错误，中断子进程
      reject(e);
      // process.exit(1);
    });
    child.on('exit', (o) => {
      // process.exit(o);
      resolve(o);
    });
  });
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
  execAsync,
};
