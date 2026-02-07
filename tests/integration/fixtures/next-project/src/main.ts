// Creates circular dependency with helper
import { helper } from './helper';

export function main() {
  return helper();
}

export const value = 42;
