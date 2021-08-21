#!/usr/bin/env node

const importLocal = require('import-local');

if (importLocal(__filename)) {
  // 最外层的node_modules里面存在此npm包，就是引用远程包，就走这里
  require('npmlog').info('cli', '正在使用 bourne-cli 本地版本');
} else {
  // 本地开发调试
  require('../lib')(process.argv.slice(2));
}
