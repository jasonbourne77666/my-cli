'use strict';

const axios = require('axios');
const semver = require('semver');
const urlJoin = require('url-join');

function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  registry = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registry, npmName);

  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (res.status === 200) {
        return res.data;
      }
      return null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}

function getDefaultRegistry(isOriginal = true) {
  return isOriginal
    ? 'https://registry.npmjs.org/'
    : 'https://registry.npmjs.taobao.org/';
}

function getNpmVersion() {}

module.exports = { getNpmInfo };
