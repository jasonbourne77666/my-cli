'use strict';

const path = require('path');

module.exports = formatPath;

// 处理路径，兼容 win macOs
function formatPath(p) {
  if (p && typeof p === 'string') {
    //  获取分隔符,macos /     win \
    // 统一为 /
    const sep = path.sep;
    if (sep === '/') {
      return p;
    } else {
      return p.replace(/\\/g, '/');
    }
  }
  return p;
}
