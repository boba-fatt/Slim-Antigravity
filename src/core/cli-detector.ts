export function detectCli(): string {
  // 1. Check arguments
  const args = process.argv.slice(2);
  const cliFlagIndex = args.indexOf('--cli');
  if (cliFlagIndex !== -1 && args[cliFlagIndex + 1]) {
    return args[cliFlagIndex + 1];
  }

  // 2. Check environment variables
  if (process.env.AGY_CLI) return 'agy';
  if (process.env.GEMINI_CLI) return 'gemini';
  if (process.env.QWEN_CLI) return 'qwen';
  if (process.env.CLAUDE_CLI) return 'claude';

  // 3. Check installation path (e.g., ~/.agy/config/plugins/...)
  const currentPath = process.argv[1] || '';
  if (currentPath.includes('.agy')) return 'agy';
  if (currentPath.includes('.gemini')) return 'gemini';
  if (currentPath.includes('.qwen')) return 'qwen';
  if (currentPath.includes('.claude')) return 'claude';

  // 4. Check CWD (Extensions are often run from their own root)
  const cwd = process.cwd();
  if (cwd.includes('.agy')) return 'agy';
  if (cwd.includes('.gemini')) return 'gemini';
  if (cwd.includes('.qwen')) return 'qwen';
  if (cwd.includes('.claude')) return 'claude';

  // Default fallback or error
  throw new Error('Could not detect CLI. Please use --cli [agy, gemini, qwen, claude] or set env vars.');
}
