import { spawn, ChildProcess } from 'child_process';
import { MCPServerConfig } from '../types/mcp-types.js';
import * as readline from 'readline';

export class McpClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private rl: readline.Interface | null = null;

  async connect(config: MCPServerConfig): Promise<void> {
    this.process = spawn(config.command, config.args, {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, inherit stderr
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('Failed to spawn MCP server with stdio');
    }

    this.rl = readline.createInterface({
      input: this.process.stdout,
      terminal: false
    });

    this.rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (e) {
        console.error('Failed to parse JSON-RPC message:', line);
      }
    });

    this.process.on('error', (err) => {
      console.error('MCP server process error:', err);
      this.close();
    });

    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`MCP server exited with code ${code}`);
      }
      this.close();
    });

    // Initialize handshake
    await this.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
            name: 'slim',
            version: '1.0.0'
        }
    });

    // Notify initialized
    this.notify('notifications/initialized', {});
  }

  async request(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Client not connected');
    }

    const id = this.requestId++;
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
      
      // Timeout after 10s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error(`Request ${method} timed out`));
        }
      }, 10000);
    });
  }

  notify(method: string, params?: any): void {
      if (!this.process || !this.process.stdin) return;
      const notification = {
          jsonrpc: '2.0',
          method,
          params
      };
      this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  private handleMessage(message: any) {
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(message.error);
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    // Reject all pending
    for (const { reject } of this.pendingRequests.values()) {
        reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}
