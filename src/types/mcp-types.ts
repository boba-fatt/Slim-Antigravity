export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

export interface SkillDefinition {
  skill: string;
  server: string;
  signature: string;
  actions: string[];
  description: string;
}

export interface SkillRegistry {
  [skillName: string]: {
    server: string;
    actions: Record<string, string>; // Maps action name to tool name (usually identity mapping)
  };
}

export interface DetectedCLI {
  name: 'gemini' | 'qwen' | 'claude' | 'agy';
  configPath: string;
}

export interface SlimConfig {
  cli: string;
  servers: Record<string, MCPServerConfig>;
}
