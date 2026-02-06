import type { Plugin } from 'vite';
import { Scanner } from '../core/scanner';
import type { RuleResult } from '../core/rules';
import { loadConfig, createRunner } from '../core/bootstrap';
import { writeReportFile } from '../core/reporter';
import path from 'path';
import pc from 'picocolors';

export interface VitePluginOptions {
  configPath?: string;
  enabled?: boolean;
  failOnError?: boolean;
}

export default function codePuffinPlugin(options: VitePluginOptions = {}): Plugin {
  async function runScan(root: string) {
    const enabled = options.enabled ?? true;
    if (!enabled) return;

    const configPath = path.resolve(root, options.configPath || 'puffin.json');

    let loaded;
    try {
      loaded = loadConfig(configPath);
    } catch (e) {
      console.warn(pc.yellow(`[CodePuffin] Failed to parse config: ${e}`));
      return;
    }

    if (!loaded.success) {
      console.warn(pc.yellow(`[CodePuffin] Invalid configuration:\n${loaded.error}`));
      return;
    }

    const config = loaded.data;
    const scanner = new Scanner(root, config);
    const context = await scanner.createContext();
    const runner = createRunner(config);
    const scanResults = await runner.run(context);

    if (scanResults.length > 0) {
      console.log(pc.blue('\n🐧 CodePuffin architectural scan results:'));

      scanResults.forEach((res: RuleResult) => {
        const relativePath = path.relative(root, res.file);
        const location = res.line ? `${relativePath}:${res.line}` : relativePath;
        const label = res.severity === 'error' ? pc.red('ERROR') : pc.yellow('WARN');
        console.log(`  ${label} ${pc.bold(res.ruleId)}: ${res.message} (${location})`);
      });
      console.log('');
    }

    // Write report file if configured
    writeReportFile(config, scanResults, root);

    if (options.failOnError && scanResults.some(r => r.severity === 'error')) {
      throw new Error('[CodePuffin] Architectural scan failed with errors.');
    }
  }

  return {
    name: 'vite-plugin-codepuffin',

    async buildStart() {
      await runScan(process.cwd());
    },

    async handleHotUpdate({ server }) {
      await runScan(server.config.root);
    },
  };
}
