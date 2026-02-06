import type { Plugin } from 'vite';
import { Scanner } from '../core/scanner';
import type { RuleResult } from '../core/rules';
import { loadConfig, createRunner } from '../core/bootstrap';
import path from 'path';
import pc from 'picocolors';

export interface VitePluginOptions {
  configPath?: string;
}

export default function codePuffinPlugin(options: VitePluginOptions = {}): Plugin {
  return {
    name: 'vite-plugin-codepuffin',
    async buildStart() {
      const root = process.cwd();
      const configPath = path.resolve(root, options.configPath || 'puffin.json');

      let loaded;
      try {
        loaded = loadConfig(configPath);
      } catch (e) {
        this.warn(`Failed to parse CodePuffin config: ${e}`);
        return;
      }

      if (!loaded.success) {
        this.warn(`Invalid CodePuffin configuration:\n${loaded.error}`);
        return;
      }

      const scanner = new Scanner(root, loaded.data);
      const context = await scanner.createContext();
      const runner = createRunner(loaded.data);
      const scanResults = await runner.run(context);

      if (scanResults.length > 0) {
        console.log(pc.blue('\n🐧 CodePuffin architectural scan results:'));

        scanResults.forEach((res: RuleResult) => {
          const relativePath = path.relative(root, res.file);
          const location = res.line ? `${relativePath}:${res.line}` : relativePath;
          const message = `${pc.bold(res.ruleId)}: ${res.message} (${location})`;

          if (res.severity === 'error') {
            this.error(message);
          } else {
            this.warn(message);
          }
        });
      }
    }
  };
}
