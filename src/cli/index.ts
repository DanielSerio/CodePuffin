import { Command } from 'commander';
import pc from 'picocolors';
import path from 'path';
import { Scanner } from '../core/scanner';
import { RuleResult } from '../core/rules';
import { reportStylish, writeReportFile } from '../core/reporter';
import { loadConfig, createRunner } from '../core/bootstrap';

const program = new Command();

program
  .name('puffin')
  .description('High-performance static analysis tool for architectural enforcement')
  .version('1.0.0');

interface ScanOptions {
  config: string;
}

async function runScan(directory: string, options: ScanOptions) {
  const configPath = path.resolve(process.cwd(), options.config);

  console.log(pc.blue(`\n🚀 Starting scan in ${pc.bold(directory)}...`));

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

  const validatedConfig = loaded.data;
  const scanner = new Scanner(directory, validatedConfig);
  const context = await scanner.createContext();

  console.log(pc.gray(`\n📂 Discovered ${pc.white(context.files.length)} files.`));

  const moduleCount = Object.keys(context.modules).length;
  if (moduleCount > 0) {
    console.log(pc.gray(`📦 Resolved ${pc.white(moduleCount)} modules:`));
    for (const name of Object.keys(context.modules)) {
      console.log(pc.gray(`   - @${name} (${context.modules[name].length} files)`));
    }
  }

  const runner = createRunner(validatedConfig);
  const results = await runner.run(context);

  // Always print stylish output to the console
  reportStylish(results, context.root);

  // Write report file if configured
  writeReportFile(validatedConfig, results, context.root);

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
  .action((directory: string, options: ScanOptions) => {
    runScan(directory, options).catch((err: Error) => {
      console.error(pc.red(`\n✖ ${err.message}`));
      process.exit(1);
    });
  });

program.parse();
