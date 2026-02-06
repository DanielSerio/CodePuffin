import { Scanner } from '../core/scanner';
import { Runner } from '../core/runner';
import { LineLimitsRule } from '../rules/line-limits';
import { NamingConventionRule } from '../rules/naming-convention';
import { DeadCodeRule } from '../rules/dead-code';
import { ConfigSchema } from '../core/config';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import pc from 'picocolors';

export interface NextPluginOptions {
  configPath?: string;
  enabled?: boolean;
}

export default function withCodePuffin(nextConfig: any = {}, options: NextPluginOptions = {}) {
  return {
    ...nextConfig,
    async rewrites() {
      // We hook into rewrites or another async method that runs at the start
      // This is a common hack for Next.js plugins to run a one-time setup

      const enabled = options.enabled ?? (process.env.NODE_ENV === 'development' || process.env.CI === 'true');

      if (enabled) {
        const root = process.cwd();
        const configPath = path.resolve(root, options.configPath || 'puffin.json');

        let config = {};
        if (existsSync(configPath)) {
          try {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
          } catch (e) {
            console.warn(pc.yellow(`[CodePuffin] Failed to parse config: ${e}`));
          }
        }

        const result = ConfigSchema.safeParse(config);
        if (result.success) {
          const scanner = new Scanner(root, result.data);
          const context = await scanner.createContext();
          const runner = new Runner();

          if (result.data.rules?.['line-limits']) runner.addRule(new LineLimitsRule());
          if (result.data.rules?.['naming-convention']) runner.addRule(new NamingConventionRule());
          if (result.data.rules?.['dead-code']) runner.addRule(new DeadCodeRule());

          const scanResults = await runner.run(context);

          if (scanResults.length > 0) {
            console.log(pc.blue('\n🐧 CodePuffin architectural scan results:'));
            scanResults.forEach(res => {
              const relativePath = path.relative(root, res.file);
              const label = res.severity === 'error' ? pc.red('ERROR') : pc.yellow('WARN');
              console.log(`  ${label} [${res.ruleId}] ${res.message} (${relativePath}${res.line ? ':' + res.line : ''})`);
            });
            console.log('');
          }
        }
      }

      return nextConfig.rewrites ? await nextConfig.rewrites() : [];
    }
  };
}
