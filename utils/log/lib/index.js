'use strict';

const log = require('npmlog');
// 定制debug或其他类型模式
// log源码 log.addLevel('verbose', 1000, { fg: 'blue', bg: 'black' }, 'verb')
// 等级1000较低，默认为info模式，不会显示低于2000的log。
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'; // 判断debug模式
log.addLevel('success', 2000, { fg: 'white', bg: 'green' }); // 添加自定义命令

// // 自定义样式
// log.heading = 'norman'; // 前缀
// log.headingStyle = { fg: 'red', bg: 'black' }; // 前缀的样式

module.exports = log;
