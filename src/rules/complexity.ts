import ts from 'typescript';
import path from 'path';
import pc from 'picocolors';
import { readFileSync } from 'fs';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';

interface FunctionInfo {
  name: string;
  node: ts.Node;
  line: number;
}

// Calculates cyclomatic complexity for a function body.
// Cyclomatic = 1 + number of branching decision points.
export function calculateCyclomatic(node: ts.Node, source: ts.SourceFile): number {
  let complexity = 1;

  const walk = (child: ts.Node) => {
    switch (child.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ConditionalExpression: // ternary ?:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
        complexity++;
        break;
      case ts.SyntaxKind.CaseClause: // case but not default
        complexity++;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const binary = child as ts.BinaryExpression;
        if (
          binary.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          binary.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          binary.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
          complexity++;
        }
        break;
      }
    }
    ts.forEachChild(child, walk);
  };

  ts.forEachChild(node, walk);
  return complexity;
}

// Calculates cognitive complexity for a function body.
// Increments for control flow keywords, with nesting depth penalties.
export function calculateCognitive(node: ts.Node, source: ts.SourceFile): number {
  let complexity = 0;

  const walk = (child: ts.Node, depth: number) => {
    switch (child.kind) {
      case ts.SyntaxKind.IfStatement: {
        const ifStmt = child as ts.IfStatement;
        // Check if this is an "else if" (parent is the else branch of another if)
        const isElseIf = child.parent && ts.isIfStatement(child.parent) && child.parent.elseStatement === child;
        if (isElseIf) {
          // else if: +1 base, no nesting penalty
          complexity += 1;
        } else {
          // standalone if: +1 base + nesting penalty
          complexity += 1 + depth;
        }

        // Walk condition for logical operators
        walkExpression(ifStmt.expression, depth);
        // Walk then block at increased depth
        walkBlock(ifStmt.thenStatement, depth + 1);

        // Handle else clause
        if (ifStmt.elseStatement) {
          if (ts.isIfStatement(ifStmt.elseStatement)) {
            // else if: recurse without increasing depth
            walk(ifStmt.elseStatement, depth);
          } else {
            // plain else: +1 base, no nesting penalty
            complexity += 1;
            walkBlock(ifStmt.elseStatement, depth + 1);
          }
        }
        return; // Don't use default child walking
      }

      case ts.SyntaxKind.SwitchStatement:
        // +1 base + nesting penalty
        complexity += 1 + depth;
        ts.forEachChild(child, c => walk(c, depth + 1));
        return;

      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
        // +1 base + nesting penalty
        complexity += 1 + depth;
        ts.forEachChild(child, c => walk(c, depth + 1));
        return;

      case ts.SyntaxKind.CatchClause:
        // +1 base + nesting penalty
        complexity += 1 + depth;
        ts.forEachChild(child, c => walk(c, depth + 1));
        return;

      case ts.SyntaxKind.ConditionalExpression:
        // ternary: +1 base + nesting penalty
        complexity += 1 + depth;
        ts.forEachChild(child, c => walk(c, depth + 1));
        return;

      case ts.SyntaxKind.BinaryExpression: {
        const binary = child as ts.BinaryExpression;
        if (
          binary.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          binary.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          binary.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
          // +1 base, no nesting penalty for logical operators
          complexity += 1;
        }
        // Walk children at same depth
        ts.forEachChild(child, c => walk(c, depth));
        return;
      }

      // Nested function declarations increase nesting depth
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        ts.forEachChild(child, c => walk(c, depth + 1));
        return;
    }

    // Default: walk children at same depth
    ts.forEachChild(child, c => walk(c, depth));
  };

  // Walk only expressions looking for logical operators (used inside if conditions)
  const walkExpression = (expr: ts.Node, depth: number) => {
    if (ts.isBinaryExpression(expr)) {
      if (
        expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        expr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity += 1;
      }
      walkExpression(expr.left, depth);
      walkExpression(expr.right, depth);
    }
  };

  // Walk block statements at the given depth
  const walkBlock = (stmt: ts.Statement, depth: number) => {
    if (ts.isBlock(stmt)) {
      stmt.statements.forEach(s => walk(s, depth));
    } else {
      walk(stmt, depth);
    }
  };

  ts.forEachChild(node, child => walk(child, 0));
  return complexity;
}

// Finds all function-like nodes in the AST
function findFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  const walk = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      functions.push({
        name: node.name.text,
        node: node.body,
        line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
      });
    } else if (ts.isMethodDeclaration(node) && node.name && node.body) {
      const name = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile);
      functions.push({
        name,
        node: node.body,
        line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
      });
    } else if (ts.isArrowFunction(node) && node.body) {
      // Arrow functions named via variable declaration
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        functions.push({
          name: parent.name.text,
          node: node.body,
          line: sourceFile.getLineAndCharacterOfPosition(parent.name.getStart()).line + 1,
        });
      }
    } else if (ts.isFunctionExpression(node) && node.body) {
      // Named function expressions, or via variable declaration
      const parent = node.parent;
      if (node.name) {
        functions.push({
          name: node.name.text,
          node: node.body,
          line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
        });
      } else if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        functions.push({
          name: parent.name.text,
          node: node.body,
          line: sourceFile.getLineAndCharacterOfPosition(parent.name.getStart()).line + 1,
        });
      }
    }

    ts.forEachChild(node, walk);
  };

  walk(sourceFile);
  return functions;
}

export class ComplexityRule implements Rule {
  id = 'complexity';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['complexity'];
    if (!config) return [];

    const results: RuleResult[] = [];
    const { severity, cyclomatic: cyclomaticThreshold, cognitive: cognitiveThreshold, overrides } = config;

    for (const filePath of context.files) {
      // Resolve per-module threshold overrides
      let fileCyclomaticThreshold = cyclomaticThreshold;
      let fileCognitiveThreshold = cognitiveThreshold;

      if (overrides) {
        for (const [moduleRef, moduleOverrides] of Object.entries(overrides)) {
          if (moduleRef.startsWith('@')) {
            const moduleName = moduleRef.slice(1);
            if (context.modules[moduleName]?.includes(filePath)) {
              if (moduleOverrides.cyclomatic !== undefined) fileCyclomaticThreshold = moduleOverrides.cyclomatic;
              if (moduleOverrides.cognitive !== undefined) fileCognitiveThreshold = moduleOverrides.cognitive;
              break;
            }
          }
        }
      }

      try {
        const content = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const functions = findFunctions(sourceFile);

        for (const func of functions) {
          const cyclomatic = calculateCyclomatic(func.node, sourceFile);
          const cognitive = calculateCognitive(func.node, sourceFile);

          if (cyclomatic > fileCyclomaticThreshold) {
            results.push({
              ruleId: this.id,
              file: filePath,
              line: func.line,
              message: `Function "${func.name}" has a cyclomatic complexity of ${cyclomatic} (max: ${fileCyclomaticThreshold})`,
              severity,
            });
          }

          if (cognitive > fileCognitiveThreshold) {
            results.push({
              ruleId: this.id,
              file: filePath,
              line: func.line,
              message: `Function "${func.name}" has a cognitive complexity of ${cognitive} (max: ${fileCognitiveThreshold})`,
              severity,
            });
          }
        }
      } catch (err) {
        const rel = path.relative(context.root, filePath);
        console.warn(pc.yellow(`[complexity] Skipping unparseable file: ${rel}`));
      }
    }

    return results;
  }
}
