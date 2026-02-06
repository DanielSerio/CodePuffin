import pc from 'picocolors';
import path from 'path';
import { RuleResult } from './rules';

export function reportStylish(results: RuleResult[], root: string) {
  if (results.length === 0) {
    console.log(pc.green('\n✔ No issues found!'));
    return;
  }

  const grouped = results.reduce((acc, result) => {
    if (!acc[result.file]) acc[result.file] = [];
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, RuleResult[]>);

  console.log(pc.red(`\n✖ Found ${results.length} issues:\n`));

  for (const [file, fileResults] of Object.entries(grouped)) {
    const relativeFile = path.relative(root, file);
    console.log(pc.underline(pc.white(relativeFile)));

    for (const res of fileResults) {
      const color = res.severity === 'error' ? pc.red : pc.yellow;
      const label = res.severity.toUpperCase();
      console.log(`  ${color(label.padEnd(7))} ${res.message} ${pc.gray(res.ruleId)}`);
    }
    console.log('');
  }
}
