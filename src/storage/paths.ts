import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const SLIM_DIR = '.slim';

export function getSlimRoot(): string {
  const root = path.join(os.homedir(), SLIM_DIR);
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

export function getSlimBinDir(): string {
  const root = getSlimRoot();
  const binDir = path.join(root, 'dist');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  return binDir;
}

export function getCliDir(cli: string): string {
  const root = getSlimRoot();
  const cliDir = path.join(root, cli);
  if (!fs.existsSync(cliDir)) {
    fs.mkdirSync(cliDir, { recursive: true });
  }
  return cliDir;
}

export function getSkillDir(cli: string): string {
  const home = os.homedir();
  const skillDir = path.join(home, `.${cli}`, 'skills');
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
  return skillDir;
}

export function getSchemaDir(cli: string): string {
  const cliDir = getCliDir(cli);
  const schemaDir = path.join(cliDir, 'schemas');
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }
  return schemaDir;
}

export function getRegistryPath(cli: string): string {
  const root = getSlimRoot();
  return path.join(root, `registry-${cli}.json`);
}

export function getCliConfigPath(cli: string): string {
  const home = os.homedir();
  return path.join(home, `.${cli}`, 'settings.json');
}

export function getPluginPaths(cli: string): string[] {
  const home = os.homedir();
  const paths = [path.join(home, `.${cli}`, 'config', 'plugins')];
  if (cli === 'agy') {
    paths.push(path.join(home, '.gemini', 'config', 'plugins'));
  }
  return paths;
}
