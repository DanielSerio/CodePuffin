import { hello } from './a';

export function greet(name: string) {
  return `Hello, ${name}! ${hello()}`;
}
