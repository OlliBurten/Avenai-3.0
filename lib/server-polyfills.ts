// Server-side polyfills for browser globals
if (typeof self === 'undefined') {
  (global as any).self = global;
}

if (typeof window === 'undefined') {
  (global as any).window = global;
}

export {};
