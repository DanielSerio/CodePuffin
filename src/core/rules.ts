import { ScanContext } from './scanner';

export type Severity = 'error' | 'warn';

export interface RuleResult {
  ruleId: string;
  file: string;
  line?: number;
  message: string;
  severity: Severity;
  suggestion?: string;
}

export interface Rule {
  id: string;
  run(context: ScanContext): Promise<RuleResult[]>;
}
