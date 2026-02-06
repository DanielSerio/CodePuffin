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

// Computes summary counts from results
function summarize(results: RuleResult[]) {
  const errors = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warn').length;
  return { total: results.length, errors, warnings };
}

// Returns pretty-printed JSON report with summary and relative file paths
export function reportJson(results: RuleResult[], root: string): string {
  const summary = summarize(results);

  const mappedResults = results.map(r => {
    const entry: Record<string, unknown> = {
      ruleId: r.ruleId,
      file: path.relative(root, r.file).replace(/\\/g, '/'),
    };
    // Only include line when defined
    if (r.line !== undefined) {
      entry.line = r.line;
    }
    entry.message = r.message;
    entry.severity = r.severity;
    return entry;
  });

  return JSON.stringify({ summary, results: mappedResults }, null, 2);
}

// Returns Markdown report grouped by file with a summary table
export function reportMarkdown(results: RuleResult[], root: string): string {
  const summary = summarize(results);
  const lines: string[] = [];

  lines.push('# CodePuffin Scan Report');
  lines.push('');
  lines.push(`**Total issues:** ${summary.total} | **Errors:** ${summary.errors} | **Warnings:** ${summary.warnings}`);

  if (results.length === 0) {
    return lines.join('\n');
  }

  // Group by relative file path
  const grouped = new Map<string, RuleResult[]>();
  for (const r of results) {
    const rel = path.relative(root, r.file).replace(/\\/g, '/');
    if (!grouped.has(rel)) grouped.set(rel, []);
    grouped.get(rel)!.push(r);
  }

  for (const [file, fileResults] of grouped) {
    lines.push('');
    lines.push(`## ${file}`);
    lines.push('');
    lines.push('| Line | Severity | Rule | Message |');
    lines.push('|------|----------|------|---------|');

    for (const r of fileResults) {
      const line = r.line !== undefined ? String(r.line) : '-';
      const severity = r.severity.toUpperCase();
      lines.push(`| ${line} | ${severity} | ${r.ruleId} | ${r.message} |`);
    }
  }

  return lines.join('\n');
}
