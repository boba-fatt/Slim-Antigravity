import { detectCli } from '../core/cli-detector.js';
import { scanMcpServers } from '../core/mcp-scanner.js';
import { fetchTools } from '../core/schema-fetcher.js';
import { generateSkill } from '../core/skill-generator.js';
import { RegistryManager } from '../core/registry-manager.js';
import { getSchemaDir, getSkillDir } from '../storage/paths.js';
import { writeJsonFile } from '../storage/file-store.js';
import * as path from 'path';

export async function slimInit() {
  try {
    const cli = detectCli();
    console.log(`\nScanning MCP configuration for ${cli}...\n`);

    const servers = await scanMcpServers(cli);
    const serverNames = Object.keys(servers);

    if (serverNames.length === 0) {
      console.log('No MCP servers found. Please check your settings.json.');
      return;
    }

    const registryManager = new RegistryManager(cli);
    let totalTools = 0;
    let skillsCreated = 0;

    for (const name of serverNames) {
      const config = servers[name];
      process.stdout.write(`⏳ Processing ${name}... `);

      if (!config.command) {
        console.log('❌ (Remote HTTP/SSE servers not supported)');
        continue;
      }

      const tools = await fetchTools(name, config);
      if (tools.length === 0) {
        console.log('❌ (No tools found)');
        continue;
      }

      totalTools += tools.length;

      // 1. Cache Schema
      const schemaPath = path.join(getSchemaDir(cli), `${name}.json`);
      await writeJsonFile(schemaPath, tools);

      // 2. Generate Skill
      const skillDef = generateSkill(name, tools);
      const skillPath = path.join(getSkillDir(cli), `${skillDef.skill}.json`);
      await writeJsonFile(skillPath, skillDef);

      // 3. Update Registry
      await registryManager.updateRegistry(skillDef);

      console.log(`\r✅ Found ${name}: ${tools.length} tools -> Generated skill: ${skillDef.skill}`);
      skillsCreated++;
    }

    console.log(`\n✨ Initialization complete!`);
    console.log(`--------------------------`);
    console.log(`Skills created: ${skillsCreated}`);
    console.log(`Total tools compressed: ${totalTools}`);
    console.log(`Token reduction estimate: ~95%`);
    console.log(`--------------------------\n`);

  } catch (error: any) {
    console.error(`Error during initialization: ${error.message}`);
    process.exit(1);
  }
}
