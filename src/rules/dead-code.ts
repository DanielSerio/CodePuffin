import ts from 'typescript';
import fg from 'fast-glob';
import path from 'path';
import pc from 'picocolors';
import { readFileSync } from 'fs';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';

export class DeadCodeRule implements Rule {
  id = 'dead-code';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['dead-code'];
    if (!config) return [];

    const results: RuleResult[] = [];
    const { severity, unusedExports, unusedVariables } = config;

    // Resolve excluded file patterns (e.g., entry points like "**/index.ts")
    const excludedFiles = new Set<string>();
    if (config.exclude?.length) {
      const matched = await fg(config.exclude, {
        cwd: context.root,
        absolute: true,
        onlyFiles: true,
      });
      for (const file of matched) {
        excludedFiles.add(file);
      }
    }

    const exportMap = new Map<string, { file: string, line: number, name: string; }>();
    const importStats = new Set<string>();

    // 1. Pass 1: Collect Exports and Imports
    for (const filePath of context.files) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

        const walk = (node: ts.Node) => {
          // Track Imports
          if (ts.isImportDeclaration(node)) {
            if (node.importClause) {
              if (node.importClause.name) {
                importStats.add(node.importClause.name.text);
              }
              if (node.importClause.namedBindings) {
                if (ts.isNamedImports(node.importClause.namedBindings)) {
                  node.importClause.namedBindings.elements.forEach(el => {
                    importStats.add(el.name.text);
                  });
                } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                  importStats.add(node.importClause.namedBindings.name.text);
                }
              }
            } else {
              // Side-effect import: import './module';
              // Mark the module itself as "used" or just ignore if we only track names.
              // For now, names is all we have.
            }
          }

          // Track Exports
          if (ts.isExportDeclaration(node)) {
            // export { a, b }
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
              node.exportClause.elements.forEach(el => {
                exportMap.set(`${filePath}:${el.name.text}`, {
                  file: filePath,
                  line: sourceFile.getLineAndCharacterOfPosition(el.getStart()).line + 1,
                  name: el.name.text
                });
              });
            }
          }

          // export function foo()
          if (ts.canHaveModifiers(node)) {
            const modifiers = ts.getModifiers(node);
            const isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

            if (isExported) {
              if (ts.isFunctionDeclaration(node) && node.name) {
                exportMap.set(`${filePath}:${node.name.text}`, {
                  file: filePath,
                  line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
                  name: node.name.text
                });
              } else if (ts.isClassDeclaration(node) && node.name) {
                exportMap.set(`${filePath}:${node.name.text}`, {
                  file: filePath,
                  line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
                  name: node.name.text
                });
              } else if (ts.isVariableStatement(node)) {
                node.declarationList.declarations.forEach(decl => {
                  if (ts.isIdentifier(decl.name)) {
                    exportMap.set(`${filePath}:${decl.name.text}`, {
                      file: filePath,
                      line: sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1,
                      name: decl.name.text
                    });
                  }
                });
              } else if (ts.isInterfaceDeclaration(node) && node.name) {
                exportMap.set(`${filePath}:${node.name.text}`, {
                  file: filePath,
                  line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
                  name: node.name.text
                });
              } else if (ts.isTypeAliasDeclaration(node) && node.name) {
                exportMap.set(`${filePath}:${node.name.text}`, {
                  file: filePath,
                  line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
                  name: node.name.text
                });
              } else if (ts.isEnumDeclaration(node) && node.name) {
                exportMap.set(`${filePath}:${node.name.text}`, {
                  file: filePath,
                  line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
                  name: node.name.text
                });
              }
            }
          }

          ts.forEachChild(node, walk);
        };

        walk(sourceFile);
      } catch (err) {
        const rel = path.relative(context.root, filePath);
        console.warn(pc.yellow(`[dead-code] Skipping unparseable file: ${rel}`));
      }
    }

    // 2. Pass 2: Report Unused Exports (skip excluded files)
    if (unusedExports) {
      exportMap.forEach((info) => {
        if (excludedFiles.has(info.file)) return;
        if (!importStats.has(info.name)) {
          results.push({
            ruleId: this.id,
            file: info.file,
            line: info.line,
            message: `Export "${info.name}" is never imported.`,
            severity,
          });
        }
      });
    }

    return results;
  }
}
