import { Command } from 'commander';
import pc from 'picocolors';
import path from 'path';
import { RuleResult } from '../core/rules';
import { reportStylish, writeReportFile } from '../core/reporter';
import { loadConfig, createRunner, scan } from '../core/bootstrap';
import { Scanner } from '../core/scanner';

const program = new Command();

program
  .name('puffin')
  .description('High-performance static analysis tool for architectural enforcement')
  .version('1.0.0');

interface CliScanOptions {
  config: string;
  clean?: boolean;
}

async function runScan(directory: string, options: CliScanOptions) {
  const configPath = path.resolve(process.cwd(), options.config);

  console.log(pc.blue(`\n🚀 Starting scan in ${pc.bold(directory)}...`));

  if (options.clean) {
    console.log(pc.gray(`🧹 Clean mode: ignoring cached results.`));
  }

  let loaded;
  try {
    loaded = loadConfig(configPath);
  } catch (error) {
    console.error(pc.red(`✖ Failed to parse config file: ${error}`));
    process.exit(1);
  }

  if (!loaded.success) {
    console.error(pc.red(`\n✖ Invalid configuration:`));
    console.error(loaded.error);
    process.exit(1);
  }

  console.log(pc.green(`✔ Loaded config from ${pc.bold(options.config)}`));

  // Use the scan pipeline which handles incremental result merging
  const { config, results, fileCount, modules, context } = await scan(
    directory,
    configPath,
    { clean: options.clean },
  );

  console.log(pc.gray(`\n📂 Discovered ${pc.white(fileCount)} files.`));

  const moduleCount = Object.keys(modules).length;
  if (moduleCount > 0) {
    console.log(pc.gray(`📦 Resolved ${pc.white(moduleCount)} modules:`));
    for (const name of Object.keys(modules)) {
      console.log(pc.gray(`   - ${name} (${modules[name].length} files)`));
    }
  }

  // Always print stylish output to the console
  reportStylish(results, context.root);

  // Write report file if configured
  writeReportFile(context, results);

  if (results.some((r: RuleResult) => r.severity === 'error')) {
    console.log(pc.red('\n✖ Scan failed due to errors.'));
    process.exit(1);
  }

  console.log(pc.green('\n✨ Scan complete!'));
}

program
  .command('scan')
  .description('Scan the codebase for architectural issues')
  .argument('[directory]', 'directory to scan', '.')
  .option('-c, --config <path>', 'path to configuration file', 'puffin.json')
  .option('--clean', 'force a full re-scan, ignoring cached results')
  .action((directory: string, options: CliScanOptions) => {
    runScan(directory, options).catch((err: Error) => {
      console.error(pc.red(`\n✖ ${err.message}`));
      process.exit(1);
    });
  });

program.parse();
