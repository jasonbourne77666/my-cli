'use strict';

const Command = require('@bourne-cli-dev/command');
const log = require('@bourne-cli-dev/log');

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = this._cmd.opts().force;
    log.verbose('projectName:', this.projectName);
    log.verbose('force:' + this.force);
  }

  exec() {
    console.log('exec');
  }
}

function init(argv) {
  // console.log('init', projectName, process.env.CLI_TARGET_PATH);
  new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
