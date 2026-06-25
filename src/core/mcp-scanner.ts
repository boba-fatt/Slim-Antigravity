import { getCliConfigPath } from '../storage/paths.js';
import { readJsonFile } from '../storage/file-store.js';
import { MCPServerConfig } from '../types/mcp-types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { existsSync } from 'fs';

interface SettingsFile {
  mcpServers?: Record<string, MCPServerConfig>;
}

async function scanDirectoryForExtensions(dirPath: string, cli: string, mcpServers: Record<string, MCPServerConfig>) {
  if (!existsSync(dirPath)) return;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(dirPath, entry.name);
        const manifestPath = path.join(pluginPath, `${cli}-extension.json`);
        if (existsSync(manifestPath)) {
          try {
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            if (manifest && manifest.mcpServers) {
              // Interpolate ${extensionPath} with the actual plugin/extension path
              for (const [serverName, serverConfig] of Object.entries(manifest.mcpServers as Record<string, MCPServerConfig>)) {
                const resolvedConfig = { ...serverConfig };
                
                const replacePath = (str: string) => 
                  str
                    .replace(/\${extensionPath}/g, pluginPath)
                    .replace(/\$extensionPath/g, pluginPath)
                    .replace(/\$\{\/\}/g, path.sep)
                    .replace(/\$\{\\\\\}/g, path.sep);

                if (resolvedConfig.command) {
                  resolvedConfig.command = replacePath(resolvedConfig.command);
                }
                if (resolvedConfig.args) {
                  resolvedConfig.args = resolvedConfig.args.map(arg => replacePath(arg));
                }
                if (resolvedConfig.cwd) {
                  resolvedConfig.cwd = replacePath(resolvedConfig.cwd);
                }
                
                mcpServers[serverName] = resolvedConfig;
              }
            }
          } catch (err: any) {
            console.warn(`Could not parse manifest at ${manifestPath}: ${err.message}`);
          }
        }
      }
    }
  } catch (e: any) {
    console.warn(`Error scanning directory ${dirPath}: ${e.message}`);
  }
}

export async function scanMcpServers(cli: string): Promise<Record<string, MCPServerConfig>> {
  const mcpServers: Record<string, MCPServerConfig> = {};

  // 1. Scan global settings.json
  const configPath = getCliConfigPath(cli);
  try {
    const settings = await readJsonFile<SettingsFile>(configPath);
    if (settings && settings.mcpServers) {
      Object.assign(mcpServers, settings.mcpServers);
    }
  } catch (e) {
    // Fail silently or print warning
  }

  // 2. Scan active config plugins and general extensions
  const home = os.homedir();
  const pluginsDir = path.join(home, `.${cli}`, 'config', 'plugins');
  const extensionsDir = path.join(home, `.${cli}`, 'extensions');

  await scanDirectoryForExtensions(pluginsDir, cli, mcpServers);
  await scanDirectoryForExtensions(extensionsDir, cli, mcpServers);

  return mcpServers;
}


