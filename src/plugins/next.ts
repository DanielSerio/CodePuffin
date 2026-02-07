import { Scanner } from '../core/scanner';
import type { RuleResult } from '../core/rules';
import { loadConfig, createRunner } from '../core/bootstrap';
import { writeReportFile } from '../core/reporter';
import path from 'path';
import pc from 'picocolors';

export interface NextPluginOptions {
  configPath?: string;
  enabled?: boolean;
  failOnError?: boolean;
}

interface NextConfig {
  rewrites?: () => Promise<unknown>;
  [key: string]: unknown;
}

// NOTE: This plugin hooks into Next.js via the `rewrites()` config function, which is
// called once during startup. This is a pragmatic approach since Next.js does not expose
// a general-purpose "on build start" hook. If Next.js changes when/how `rewrites` is
// invoked, this integration may need to be updated. A webpack/turbopack plugin hook
// would be more conventional but significantly more complex to implement.
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
          const config = loaded.data;
          const scanner = new Scanner(root, config);
          const context = await scanner.createContext();
          const runner = createRunner(config);
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

          // Write report file if configured
          writeReportFile(config, scanResults, root);

          if (options.failOnError && scanResults.some(r => r.severity === 'error')) {
            throw new Error('[CodePuffin] Architectural scan failed with errors.');
          }
        } else if (loaded && !loaded.success) {
          console.warn(pc.yellow(`[CodePuffin] Invalid configuration:\n${loaded.error}`));
        }
      }

      return nextConfig.rewrites ? await nextConfig.rewrites() : [];
    }
  };
}
