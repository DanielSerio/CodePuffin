import type { Plugin } from 'vite';
import { Scanner, isSourceFile } from '../core/scanner';
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

  // Debounce HMR re-scans to avoid running a full scan on every file change
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const DEBOUNCE_MS = 500;

  return {
    name: 'vite-plugin-codepuffin',

    async buildStart() {
      await runScan(process.cwd());
    },

    handleHotUpdate({ server, file }) {
      const root = server.config.root;
      const configPath = path.resolve(root, options.configPath || 'puffin.json');

      const normalizedConfigPath = configPath.replace(/\\/g, '/');
      const normalizedFile = file.replace(/\\/g, '/');
      const relativeFile = path.relative(root, file).replace(/\\/g, '/');

      // 1. Always trigger on config changes
      const isConfigChange = normalizedFile === normalizedConfigPath;

      // 2. Ignore report directory to prevent feedback loop
      // By default, reports are written to 'reports/'. We skip this to avoid re-triggering.
      const isReportChange = relativeFile.startsWith('reports/');

      // 3. Only trigger on relevant source files (ts, js, css, etc.)
      const isRelevantSource = isSourceFile(file);

      if (!isConfigChange && (isReportChange || !isRelevantSource)) {
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runScan(root).catch(err => {
          console.warn(pc.yellow(`[CodePuffin] HMR scan failed: ${err}`));
        });
      }, DEBOUNCE_MS);
    },
  };
}
