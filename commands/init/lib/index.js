'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { homedir } = require('os');
const ejs = require('ejs');
const glob = require('glob');
const inquirer = require('inquirer');
const semver = require('semver');
const Command = require('@bourne-cli-dev/command');
const Package = require('@bourne-cli-dev/package');
const log = require('@bourne-cli-dev/log');
const { spinnerStart, sleep, execAsync } = require('@bourne-cli-dev/utils');
const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

// 命令白名单
const WHITE_COMMAND = ['npm', 'cnpm'];

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = this._argv[1].force;
    log.verbose('projectName:', this.projectName);
    log.verbose('force:' + this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose('projectInfo 选择的信息', projectInfo);
        this.projectInfo = projectInfo; // 保存为实例
        // 2.下载模板
        await this.downloadTemplate();
        // 3.安装模板
        await this.installTemplate();
      }
    } catch (e) {
      if (process.env.LOG_LEVEL === 'verbose') {
        console.log(e);
      }
      log.error(e.message);
    }
  }

  /**
   * 准备工作，命令行选项获得项目信息
   * 请求后台模板信息
   */
  async prepare() {
    // 0. 先判断是否有模板,请求后端数据
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在');
    }
    this.template = template;
    const localPath = process.cwd(); // 获取当前的文件目录,终端所在的目录
    // 1.当前目录是否为空
    const ret = this.isCwdEmpty(localPath);
    if (!ret) {
      // 不为空的情况
      let ifContinue = false;
      // 1.1当前目录不为空的时候，询问是否创建新目录
      if (!this.force) {
        ifContinue = (
          await inquirer.prompt([
            {
              type: 'confirm',
              message: '当前文件不为空，是否继续创建项目？',
              default: false,
              name: 'ifContinue',
            },
          ])
        ).ifContinue;

        if (!ifContinue) {
          // 选择不清空，直接结束运行
          return null;
        }
      }
      // 2.是否强制更新
      if (ifContinue || this.force) {
        // 做二次确认
        const { confirmDelete } = await inquirer.prompt([
          {
            type: 'confirm',
            message: '是否确认清空当前目录？',
            default: false,
            name: 'confirmDelete',
          },
        ]);
        // 清空 localPath 目录
        confirmDelete && fse.emptyDirSync(localPath);
        if (!confirmDelete) {
          return null;
        }
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    // 校验项目名称
    function isValidateName(name) {
      return /^[a-zA-Z]+[a-zA-Z0-9]+/.test(name);
    }

    let projectInfo = {};

    // 1.创建项目或者组建
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [
        { name: '项目', value: TYPE_PROJECT },
        { name: '组件', value: TYPE_COMPONENT },
      ],
    });

    const title = type === TYPE_PROJECT ? '项目' : '组件';

    // 根据选的项目类型，筛选对应的模板
    this.template = this.template.filter((template) =>
      template.tag.includes(type)
    );

    const promptList = [];

    // 2.获取项目的基本信息
    promptList.push(
      {
        type: 'input',
        name: 'projectName',
        message: `请输入${title}名称`,
        default: isValidateName(this.projectName)
          ? this.projectName
          : 'MyProject',
        validate(v) {
          // 校验项目名字
          // Declare function as asynchronous, and save the done callback
          const done = this.async();
          // Do async stuff
          setTimeout(function () {
            if (!isValidateName(v)) {
              // Pass the return value in the done callback
              done(`请输入合法的${title}名称`);
              return;
            }
            // Pass the return value in the done callback
            done(null, true);
          }, 0);
        },
        filter: (v) => {
          return v;
        },
      },
      {
        type: 'input',
        name: 'projectVersion',
        message: `请输入${title}版本号`,
        default: '1.0.0',
        validate: (v) => {
          return !!semver.valid(v);
        },
        filter: (v) => {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: 'list',
        name: 'projectTemplate',
        message: `请选择${title}模板`,
        default: TYPE_PROJECT,
        choices: this.template.map((item) => ({
          name: item.name,
          value: item.npmName,
        })),
      }
    );

    if (type === TYPE_PROJECT) {
      // 获取项目基本信息
      const userPick = await inquirer.prompt(promptList);
      projectInfo = {
        type,
        ...userPick,
      };
    } else if (type === TYPE_COMPONENT) {
      // 添加组件描述
      promptList.push({
        type: 'input',
        name: 'componentDescription',
        message: `请输入${title}描述信息`,
        default: '',
        validate(v) {
          const done = this.async();
          setTimeout(function () {
            if (!v) {
              done(`请输入${title}描述信息`);
              return;
            }
            done(null, true);
          }, 0);
        },
      });

      // 获取组件基本信息
      const userPick = await inquirer.prompt(promptList);
      projectInfo = {
        type,
        ...userPick,
      };
    }

    // 格式化项目名称,myProject => my-project
    if (projectInfo.projectName) {
      projectInfo.className = require('kebab-case')(
        projectInfo.projectName
      ).replace(/^-/, '');
      projectInfo.name = projectInfo.className;
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }

    return projectInfo;
  }

  // 当前目录是否为空
  isCwdEmpty(localPath) {
    // 文件过滤 .git node_modules
    const fileList = fs.readdirSync(localPath).filter((file, index) => {
      return !file.startsWith('.') && ['node_modules'].indexOf(file) < 0;
    });

    return !fileList || fileList.length <= 0;
  }

  // 安装模板通用
  async installTemplate() {
    log.verbose('templateInfo 管理后台模板信息', this.templateInfo);
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装，（不需要，未完成，文件拷贝 ejs解析 都放在模板的入口文件，执行该文件拷贝项目）
        // await this.installCustomTemplate();
      } else {
        throw new Error('不能识别模板信息！');
      }
    } else {
      throw new Error('模板信息不存在！');
    }
  }

  // ejs 处理模板，自定义模板
  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;

    return new Promise((resolve, reject) => {
      glob(
        '**',
        {
          cwd: dir,
          ignore: options.ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject();
          }
          // 遍历所有
          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              return new Promise((resolve, reject) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                  if (err) {
                    // console.log(err);
                    reject(err);
                  } else {
                    // 写入文件
                    fse.writeFileSync(filePath, result);
                    resolve(result);
                  }
                });
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      );
    });
  }

  // 安装标准模板
  async installNormalTemplate() {
    log.verbose('templateNpm 安装模板信息', this.templateNpm);
    const spinner = spinnerStart('正在安装标准模板...');
    await sleep(1000);
    try {
      // 将下载的模板里面文件，拷贝到当前目录
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath, // 拼接好的模板缓存目录
        'template'
      );
      const targetPath = process.cwd();

      //  确保目录都存在，没有就会创建
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (error) {
      throw error;
    } finally {
      spinner.stop(true);
      log.success('标准模板安装成功！');
    }

    // ejs转换
    const templateIgnore = this.templateInfo?.ignore ?? [];
    const ignore = ['**/node_modules/**', ...templateIgnore];
    await this.ejsRender({ ignore });

    // 安装依赖
    const { installCommand, startCommand } = this.templateInfo;
    return;
    await this.execCommand(installCommand, '依赖安装失败！');
    // 执行启动命令
    await this.execCommand(startCommand, '项目启动失败！');
  }

  // 统一执行命令
  async execCommand(command, errorMsg) {
    let installRes;
    if (command) {
      const cmdArray = command.split(' ');
      const cmd = WHITE_COMMAND.includes(cmdArray[0]) ? cmdArray[0] : null;
      if (!cmd) {
        throw new Error(`命令：${command}不存在！`);
      }
      const args = cmdArray.slice(1);
      installRes = await execAsync(cmd, args, {
        pwd: process.cwd(), // 当前目录
        stdio: 'inherit', // 标准输出方式统一和父进程一起打印日志，不再需求监听stdout stderr
      });
    }
    if (installRes !== 0) {
      throw new Error(errorMsg);
    }
    return installRes;
  }

  // 安装自定义模板
  async installCustomTemplate() {
    // 自定义文件入口
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      if (fse.pathExistsSync(rootFile)) {
        log.notice('开始执行自定义模板');
        const options = {
          ...this.templateNpm,
          sourcePath: path.resolve(this.templateNpm.cacheFilePath, 'template'),
          targetPath: process.cwd(),
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose('code', code);
        await execAsync('node', ['-e', code], {
          pwd: process.cwd(), // 当前目录
          stdio: 'inherit', // 标准输出方式统一和父进程一起打印日志，不再需求监听stdout stderr
        });
        log.success('自定义模板安装成功！');
      }
    }
  }

  // 下载项目模板
  async downloadTemplate() {
    // 1. 通过项目模板API获取项目信息
    const { projectTemplate } = this.projectInfo;
    // 选择的模板信息
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    const userHome = homedir();
    const targetPath = path.resolve(userHome, '.bourne-cli-dev', 'template');
    const storeDir = path.resolve(
      userHome,
      '.bourne-cli-dev',
      'template',
      'node_modules'
    );
    const { npmName, version } = templateInfo;
    // 用户选择的模板信息
    this.templateInfo = templateInfo;
    // 下载模版
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });

    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart('正在下载模板...');
      await sleep(1000);
      try {
        await templateNpm.install();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        // 下载成功之后
        if (await templateNpm.exists()) {
          log.info('下载模板成功！');
          // 下载完成的模板信息，路径版本等
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板...');
      await sleep(1000);
      try {
        await templateNpm.update();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('更新模板成功！');
          // 下载完成的模板信息，路径版本等
          this.templateNpm = templateNpm;
        }
      }
    }
    // 1.1 通过egg.js搭建后端系统
    // 1.2 通过npm存储项目模板
    // 1.3 将项目模板信息存储到mongodb中
    // 1.4 通过egg.js获取mongodb的数据并且API返回
  }
}

function init(argv) {
  // console.log('init', projectName, process.env.CLI_TARGET_PATH);
  new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
