'use strict';

const axios = require('axios');
const semver = require('semver');
const urlJoin = require('url-join');

// 调用npm API,获取所有版本号
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

function getDefaultRegistry(isOriginal) {
  return isOriginal
    ? 'https://registry.npmjs.org/'
    : 'https://registry.npm.taobao.org/';
}

// 调用npm API,获取所有版本号
async function getNpmVersions(npmName) {
  const data = await getNpmInfo(npmName);
  if (data) {
    return Object.keys(data?.versions ?? []);
  } else {
    return [];
  }
}

/**
 * 获取所有满足条件的版本号
 * @param baseVersion 当前包的版本号
 * @param versions 所有历史版本号
 */
function getNpmSemverVersions(baseVersion, versions) {
  versions = versions
    .filter((version) => {
      // 筛选大于等于 baseVersion 的版本列表
      return semver.satisfies(version, `>=${baseVersion}`);
    })
    .sort((a, b) => {
      // 如果b大于a，b就排前面
      return semver.gt(b, a);
    });
  return versions;
}

/**
 * 获取满足条件的版本号
 * @param npmName 包名称
 */
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName);
  const newVersions = getNpmSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return '';
}

/**
 * 获取最新版本号，即所有版本中最新的
 * @param {*} npmName
 * @param {*} registry
 * @returns 返回所有的版本
 */
async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName);
  if (versions) {
    versions = versions.sort((a, b) => {
      // 如果b大于a，b就排前面
      return semver.gt(b, a);
    });
    return versions[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
