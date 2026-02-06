import ts from 'typescript';
import path from 'path';
import pc from 'picocolors';
import { readFileSync } from 'fs';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { checkCase, CaseStyle, suggestName } from '../utils/naming';

export class NamingConventionRule implements Rule {
  id = 'naming-convention';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['naming-convention'];
    if (!config) return [];

    const results: RuleResult[] = [];
    const { severity, overrides } = config;

    function isProbablyComponent(node: ts.Node): boolean {
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        let hasJsx = false;
        const checkJsx = (n: ts.Node) => {
          if (hasJsx) return;
          if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
            hasJsx = true;
            return;
          }
          ts.forEachChild(n, checkJsx);
        };
        checkJsx(node);
        return hasJsx;
      }
      if (ts.isClassDeclaration(node)) {
        return node.members.some(m =>
          ts.isMethodDeclaration(m) &&
          ts.isIdentifier(m.name) &&
          m.name.text === 'render'
        );
      }
      return false;
    }

    for (const filePath of context.files) {
      const fileName = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath);
      const isReactFile = ext === '.tsx' || ext === '.jsx';

      // Resolve styles for this file (check overrides)
      let fileStyle = config.files as CaseStyle;
      let varStyle = config.variables as CaseStyle;
      let funcStyle = config.functions as CaseStyle;
      let classStyle = config.classes as CaseStyle;
      let compEntityStyle = config.components?.entity as CaseStyle | undefined;
      let compFileStyle = config.components?.filename as CaseStyle | undefined;

      if (overrides) {
        for (const [moduleRef, moduleOverrides] of Object.entries(overrides)) {
          if (moduleRef.startsWith('@')) {
            const moduleName = moduleRef.slice(1);
            if (context.modules[moduleName]?.includes(filePath)) {
              if (moduleOverrides.files) fileStyle = moduleOverrides.files as CaseStyle;
              if (moduleOverrides.variables) varStyle = moduleOverrides.variables as CaseStyle;
              if (moduleOverrides.functions) funcStyle = moduleOverrides.functions as CaseStyle;
              if (moduleOverrides.classes) classStyle = moduleOverrides.classes as CaseStyle;
              if (moduleOverrides.components?.entity) compEntityStyle = moduleOverrides.components.entity as CaseStyle;
              if (moduleOverrides.components?.filename) compFileStyle = moduleOverrides.components.filename as CaseStyle;
            }
          }
        }
      }

      // 1. Check filename
      const effectiveFileStyle = (isReactFile && compFileStyle) ? compFileStyle : fileStyle;

      if (!checkCase(fileName, effectiveFileStyle)) {
        results.push({
          ruleId: this.id,
          file: filePath,
          message: `File name "${fileName}" should be in ${effectiveFileStyle}`,
          severity,
          suggestion: `Rename file to "${suggestName(fileName, effectiveFileStyle)}${ext}"`,
        });
      }

      // 2. Check internal names (AST)
      try {
        const content = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

        const walk = (node: ts.Node) => {
          let name: string | undefined;
          let nodeToReport: ts.Node | undefined;
          let expectedStyle: CaseStyle | undefined;
          let typeLabel: string | undefined;

          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            name = node.name.text;
            nodeToReport = node.name;
            typeLabel = 'Variable';
            expectedStyle = varStyle;

            if (isReactFile && compEntityStyle) {
              const isComp = (node.initializer && isProbablyComponent(node.initializer)) ||
                /^[A-Z]/.test(name);
              if (isComp) {
                expectedStyle = compEntityStyle;
                typeLabel = 'Component';
              }
            }
          } else if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.text;
            nodeToReport = node.name;
            typeLabel = 'Function';
            expectedStyle = funcStyle;

            if (isReactFile && compEntityStyle) {
              const isComp = isProbablyComponent(node) || /^[A-Z]/.test(name);
              if (isComp) {
                expectedStyle = compEntityStyle;
                typeLabel = 'Component';
              }
            }
          } else if (ts.isClassDeclaration(node) && node.name) {
            name = node.name.text;
            nodeToReport = node.name;
            typeLabel = 'Class';
            expectedStyle = classStyle;

            if (isReactFile && compEntityStyle) {
              const isComp = isProbablyComponent(node) || /^[A-Z]/.test(name);
              if (isComp) {
                expectedStyle = compEntityStyle;
                typeLabel = 'Component';
              }
            }
          }

          if (name && nodeToReport && expectedStyle) {
            if (!checkCase(name, expectedStyle)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(nodeToReport.getStart());
              results.push({
                ruleId: this.id,
                file: filePath,
                line: line + 1,
                message: `${typeLabel} "${name}" should be in ${expectedStyle}`,
                severity,
                suggestion: `Rename "${name}" to "${suggestName(name, expectedStyle)}"`,
              });
            }
          }
          ts.forEachChild(node, walk);
        };

        walk(sourceFile);
      } catch (err) {
        const rel = path.relative(context.root, filePath);
        console.warn(pc.yellow(`[naming-convention] Skipping unparseable file: ${rel}`));
      }
    }

    return results;
  }
}
