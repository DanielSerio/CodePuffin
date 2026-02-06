// This function has high cyclomatic and cognitive complexity
export function complexFunction(x: number, y: number, z: string) {
  if (x > 0) {
    if (y > 0) {
      for (let i = 0; i < x; i++) {
        if (z === 'a' || z === 'b') {
          console.log(i);
        }
      }
    } else if (y < 0) {
      while (x > 0) {
        x--;
      }
    }
  } else {
    switch (z) {
      case 'a': return 1;
      case 'b': return 2;
      default: return 0;
    }
  }
  return x + y;
}

// This function is simple and should not trigger
export function simpleFunction(a: number, b: number) {
  return a + b;
}
