const request = require('@bourne-cli-dev/request');

module.exports = function () {
  return request({
    url: '/project/templete',
  });
};
