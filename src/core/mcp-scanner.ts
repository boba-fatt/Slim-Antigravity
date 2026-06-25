import { getCliConfigPath, getPluginPaths } from '../storage/paths.js';
import { readJsonFile } from '../storage/file-store.js';
import { MCPServerConfig } from '../types/mcp-types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface SettingsFile {
  mcpServers?: Record<string, MCPServerConfig>;
}

export async function scanMcpServers(cli: string): Promise<Record<string, MCPServerConfig>> {
  if (cli === 'agy') {
    return discoverAgyPlugins(cli);
  }

  const configPath = getCliConfigPath(cli);
  const settings = await readJsonFile<SettingsFile>(configPath);

  if (!settings || !settings.mcpServers) {
    console.warn(`No MCP servers found in ${configPath}`);
    return {};
  }

  return settings.mcpServers;
}

async function discoverAgyPlugins(cli: string): Promise<Record<string, MCPServerConfig>> {
  const pluginDirs = [...getPluginPaths(cli)].reverse(); // Reverse so native paths are processed last and take precedence
  const servers: Record<string, MCPServerConfig> = {};

  for (const pluginsRoot of pluginDirs) {
    try {
      const entries = await fs.readdir(pluginsRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(pluginsRoot, entry.name);
          const config = await loadPluginConfig(pluginPath);
          if (config) {
            servers[entry.name] = config;
          }
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Error scanning plugins in ${pluginsRoot}:`, error.message);
      }
    }
  }

  return servers;
}

async function loadPluginConfig(pluginPath: string): Promise<MCPServerConfig | null> {
  const files = await fs.readdir(pluginPath);

  // Try JSON first
  const jsonManifest = files.find(f => f.endsWith('.json'));
  if (jsonManifest) {
    const manifest = await readJsonFile<any>(path.join(pluginPath, jsonManifest));
    if (manifest && manifest.mcpServers) {
      // If it's a multi-server manifest, just take the first one or merge?
      // The requirement says "map its commands dynamically".
      // Usually these plugins ARE the server.
      const firstServerKey = Object.keys(manifest.mcpServers)[0];
      if (firstServerKey) return manifest.mcpServers[firstServerKey];
    }
    // Fallback: maybe the manifest IS the server config
    if (manifest && manifest.command) {
      return {
        command: manifest.command,
        args: manifest.args || [],
        env: manifest.env
      };
    }
  }

  // Try TOML (simple manual parse for command/args)
  const tomlManifest = files.find(f => f.endsWith('.toml'));
  if (tomlManifest) {
    try {
      const content = await fs.readFile(path.join(pluginPath, tomlManifest), 'utf-8');
      const commandMatch = content.match(/command\s*=\s*"([^"]+)"/);
      const argsMatch = content.match(/args\s*=\s*\[([^\]]+)\]/);

      if (commandMatch) {
        let args: string[] = [];
        if (argsMatch) {
          args = argsMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        }
        return {
          command: commandMatch[1],
          args: args
        };
      }
    } catch (e) {
      console.warn(`Failed to parse TOML manifest in ${pluginPath}`);
    }
  }

  return null;
}
