import ts from 'typescript';
import path from 'path';
import { readFileSync } from 'fs';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { checkCase, CaseStyle } from '../utils/naming';

export class NamingConventionRule implements Rule {
  id = 'naming-convention';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['naming-convention'];
    if (!config) return [];

    const results: RuleResult[] = [];
    const { severity, overrides } = config;

    for (const filePath of context.files) {
      const fileName = path.basename(filePath, path.extname(filePath));

      // Resolve styles for this file (check overrides)
      let fileStyle = config.files as CaseStyle;
      let varStyle = config.variables as CaseStyle;
      let funcStyle = config.functions as CaseStyle;
      let classStyle = config.classes as CaseStyle;

      if (overrides) {
        for (const [moduleRef, moduleOverrides] of Object.entries(overrides)) {
          const overridesAny = moduleOverrides as any;
          if (moduleRef.startsWith('@')) {
            const moduleName = moduleRef.slice(1);
            if (context.modules[moduleName]?.includes(filePath)) {
              if (overridesAny.files) fileStyle = overridesAny.files;
              if (overridesAny.variables) varStyle = overridesAny.variables;
              if (overridesAny.functions) funcStyle = overridesAny.functions;
              if (overridesAny.classes) classStyle = overridesAny.classes;
            }
          }
        }
      }

      // 1. Check filename
      if (!checkCase(fileName, fileStyle)) {
        results.push({
          ruleId: this.id,
          file: filePath,
          message: `File name "${fileName}" should be in ${fileStyle}`,
          severity,
        });
      }

      // 2. Check internal names (AST)
      try {
        const content = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

        const walk = (node: ts.Node) => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            const name = node.name.text;
            if (!checkCase(name, varStyle)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
              results.push({
                ruleId: this.id,
                file: filePath,
                line: line + 1,
                message: `Variable "${name}" should be in ${varStyle}`,
                severity,
              });
            }
          } else if (ts.isFunctionDeclaration(node) && node.name) {
            const name = node.name.text;
            if (!checkCase(name, funcStyle)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
              results.push({
                ruleId: this.id,
                file: filePath,
                line: line + 1,
                message: `Function "${name}" should be in ${funcStyle}`,
                severity,
              });
            }
          } else if (ts.isClassDeclaration(node) && node.name) {
            const name = node.name.text;
            if (!checkCase(name, classStyle)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
              results.push({
                ruleId: this.id,
                file: filePath,
                line: line + 1,
                message: `Class "${name}" should be in ${classStyle}`,
                severity,
              });
            }
          }
          ts.forEachChild(node, walk);
        };

        walk(sourceFile);
      } catch (err) {
        // Skip files that fail to parse
      }
    }

    return results;
  }
}
