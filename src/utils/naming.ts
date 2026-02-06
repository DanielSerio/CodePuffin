export type CaseStyle = 'kebab-case' | 'camelCase' | 'PascalCase' | 'UPPER_SNAKE_CASE' | 'useCamelCase' | 'usePascalCase';

export function checkCase(name: string, style: CaseStyle): boolean {
  switch (style) {
    case 'kebab-case':
      return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
    case 'camelCase':
      return /^[a-z][a-zA-Z0-9]*$/.test(name);
    case 'PascalCase':
      return /^[A-Z][a-zA-Z0-9]*$/.test(name);
    case 'UPPER_SNAKE_CASE':
      return /^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(name);
    case 'useCamelCase':
      return /^use[A-Z][a-zA-Z0-9]*$/.test(name);
    case 'usePascalCase':
      return /^use[A-Z][a-zA-Z0-9]*$/.test(name); // Same as PascalCase but starting with 'use'
    default:
      return true;
  }
}
