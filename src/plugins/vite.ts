import type { Plugin } from 'vite';
import { Scanner } from '../core/scanner';
import { Runner } from '../core/runner';
import { LineLimitsRule } from '../rules/line-limits';
import { NamingConventionRule } from '../rules/naming-convention';
import { DeadCodeRule } from '../rules/dead-code';
import { ConfigSchema } from '../core/config';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import pc from 'picocolors';

export interface VitePluginOptions {
  configPath?: string;
}

export default function codePuffinPlugin<A>(options: VitePluginOptions = {}): Plugin<A> {
  return {
    name: 'vite-plugin-codepuffin',
    async buildStart() {
      const root = process.cwd();
      const configPath = path.resolve(root, options.configPath || 'puffin.json');

      let config = {};
      if (existsSync(configPath)) {
        try {
          config = JSON.parse(readFileSync(configPath, 'utf-8'));
        } catch (e) {
          this.warn(`Failed to parse CodePuffin config: ${e}`);
        }
      }

      const result = ConfigSchema.safeParse(config);
      if (!result.success) {
        this.warn(`Invalid CodePuffin configuration:\n${JSON.stringify(result.error.format(), null, 2)}`);
        return;
      }

      const validatedConfig = result.data;
      const scanner = new Scanner(root, validatedConfig);
      const context = await scanner.createContext();

      const runner = new Runner();
      if (validatedConfig.rules?.['line-limits']) runner.addRule(new LineLimitsRule());
      if (validatedConfig.rules?.['naming-convention']) runner.addRule(new NamingConventionRule());
      if (validatedConfig.rules?.['dead-code']) runner.addRule(new DeadCodeRule());

      const scanResults = await runner.run(context);

      if (scanResults.length > 0) {
        console.log(pc.blue('\n🐧 CodePuffin architectural scan results:'));

        scanResults.forEach(res => {
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
