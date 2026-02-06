import { Command } from 'commander';
import pc from 'picocolors';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { ConfigSchema } from '../core/config';
import { Scanner } from '../core/scanner';
import { Runner } from '../core/runner';
import { LineLimitsRule } from '../rules/line-limits';
import { NamingConventionRule } from '../rules/naming-convention';
import { DeadCodeRule } from '../rules/dead-code';
import { reportStylish } from '../core/reporter';


const program = new Command();

program
  .name('puffin')
  .description('High-performance static analysis tool for architectural enforcement')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan the codebase for architectural issues')
  .argument('[directory]', 'directory to scan', '.')
  .option('-c, --config <path>', 'path to configuration file', 'puffin.json')
  .action((directory, options) => {
    const configPath = path.resolve(process.cwd(), options.config);

    console.log(pc.blue(`\n🚀 Starting scan in ${pc.bold(directory)}...`));

    let config = {};
    if (existsSync(configPath)) {
      try {
        const fileContent = readFileSync(configPath, 'utf-8');
        config = JSON.parse(fileContent);
        console.log(pc.green(`✔ Loaded config from ${pc.bold(options.config)}`));
      } catch (error) {
        console.error(pc.red(`✖ Failed to parse config file: ${error}`));
        process.exit(1);
      }
    } else {
      console.log(pc.yellow(`ℹ No config file found at ${options.config}, using defaults.`));
    }

    const result = ConfigSchema.safeParse(config);
    if (!result.success) {
      console.error(pc.red(`\n✖ Invalid configuration:`));
      console.error(result.error.format());
      process.exit(1);
    }

    const validatedConfig = result.data;
    const scanner = new Scanner(directory, validatedConfig);

    (async () => {
      const context = await scanner.createContext();

      console.log(pc.gray(`\n📂 Discovered ${pc.white(context.files.length)} files.`));

      const moduleCount = Object.keys(context.modules).length;
      if (moduleCount > 0) {
        console.log(pc.gray(`📦 Resolved ${pc.white(moduleCount)} modules:`));
        for (const name of Object.keys(context.modules)) {
          console.log(pc.gray(`   - @${name} (${context.modules[name].length} files)`));
        }
      }

      const runner = new Runner();

      if (validatedConfig.rules?.['line-limits']) {
        runner.addRule(new LineLimitsRule());
      }

      if (validatedConfig.rules?.['naming-convention']) {
        runner.addRule(new NamingConventionRule());
      }

      if (validatedConfig.rules?.['dead-code']) {
        runner.addRule(new DeadCodeRule());
      }

      const results = await runner.run(context);

      reportStylish(results, context.root);

      if (results.some(r => r.severity === 'error')) {
        console.log(pc.red('\n✖ Scan failed due to errors.'));
        process.exit(1);
      }

      console.log(pc.green('\n✨ Scan complete!'));
    })();

  });

program.parse();
