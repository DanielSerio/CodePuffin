// Creates circular dependency with main
import { value } from './main';

export function helper() {
  return value * 2;
}
