import ts from 'typescript';
import { readFileSync } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';

export class NoAnyRule implements Rule {
  id = 'no-any';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['no-any'];
    if (!config) return [];

    const results: RuleResult[] = [];
    const { severity } = config;

    for (const filePath of context.files) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

        const walk = (node: ts.Node) => {
          if (node.kind === ts.SyntaxKind.AnyKeyword) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            results.push({
              ruleId: this.id,
              file: filePath,
              line: line + 1,
              message: 'Using "any" type is forbidden. Use a more specific type or "unknown".',
              severity,
            });
          }
          ts.forEachChild(node, walk);
        };

        walk(sourceFile);
      } catch (err) {
        const rel = path.relative(context.root, filePath);
        console.warn(pc.yellow(`[no-any] Skipping unparseable file: ${rel}`));
      }
    }

    return results;
  }
}
