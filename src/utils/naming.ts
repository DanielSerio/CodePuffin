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
      return /^Use[A-Z][a-zA-Z0-9]*$/.test(name);
    default:
      return true;
  }
}

export function suggestName(name: string, style: CaseStyle): string {
  // Simple conversion logic
  const parts = name.split(/[-_ ]|(?=[A-Z])/).filter(p => !!p).map(p => p.toLowerCase());

  switch (style) {
    case 'kebab-case':
      return parts.join('-');
    case 'camelCase':
      return parts.map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
    case 'PascalCase':
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    case 'UPPER_SNAKE_CASE':
      return parts.join('_').toUpperCase();
    case 'useCamelCase': {
      const base = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      return base.startsWith('Use') ? 'u' + base.slice(1) : 'use' + base;
    }
    case 'usePascalCase': {
      const base = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      return base.startsWith('Use') ? base : 'Use' + base;
    }
    default:
      return name;
  }
}
