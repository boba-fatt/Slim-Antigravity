#!/usr/bin/env node
import { slimInit } from './cli/slim-init.js';
import { slimInspect } from './cli/slim-inspect.js';
import { slimStatus } from './cli/slim-status.js';
import { slimUpdate } from './cli/slim-update.js';
import { slimDoc } from './cli/slim-doc.js';
import { executeSkill } from './core/skill-router.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      await slimInit();
      break;
    case 'inspect':
      await slimInspect();
      break;
    case 'status':
      await slimStatus();
      break;
    case 'update':
      await slimUpdate();
      break;
    case 'doc':
      await slimDoc();
      break;
    case 'execute':
      const [skill, action, paramsJson] = args.slice(1);
      if (!skill || !action || !paramsJson) {
        console.error('Usage: slim execute <skill> <action> <params_json>');
        process.exit(1);
      }
      try {
        const params = JSON.parse(paramsJson);
        const result = await executeSkill(skill, action, params);
        console.log(JSON.stringify(result, null, 2));
      } catch (e: any) {
        console.error(`Execution error: ${e.message}`);
        process.exit(1);
      }
      break;
    default:
      console.log(`
Usage: slim <command> [options]

Commands:
  init      Initialize slim and generate skills from MCP servers
  inspect   View generated skills and actions
  status    Show token usage and compression reports
  update    Sync changes from host CLI settings
  doc       Generate markdown documentation for skills

Options:
  --cli <name>  Manually specify CLI (agy, gemini, qwen, claude)
      `);
      break;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
