import { Scanner } from '../core/scanner';
import type { RuleResult } from '../core/rules';
import { loadConfig, createRunner } from '../core/bootstrap';
import path from 'path';
import pc from 'picocolors';

export interface NextPluginOptions {
  configPath?: string;
  enabled?: boolean;
}

// Minimal structural type for Next.js config (avoids depending on `next`)
interface NextConfig {
  rewrites?: () => Promise<unknown>;
  [key: string]: unknown;
}

export default function withCodePuffin(nextConfig: NextConfig = {}, options: NextPluginOptions = {}) {
  return {
    ...nextConfig,
    async rewrites() {
      const enabled = options.enabled ?? (process.env.NODE_ENV === 'development' || process.env.CI === 'true');

      if (enabled) {
        const root = process.cwd();
        const configPath = path.resolve(root, options.configPath || 'puffin.json');

        let loaded;
        try {
          loaded = loadConfig(configPath);
        } catch (e) {
          console.warn(pc.yellow(`[CodePuffin] Failed to parse config: ${e}`));
          loaded = null;
        }

        if (loaded?.success) {
          const scanner = new Scanner(root, loaded.data);
          const context = await scanner.createContext();
          const runner = createRunner(loaded.data);
          const scanResults = await runner.run(context);

          if (scanResults.length > 0) {
            console.log(pc.blue('\n🐧 CodePuffin architectural scan results:'));
            scanResults.forEach((res: RuleResult) => {
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
