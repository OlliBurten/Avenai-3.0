// instrumentation.ts
// This runs before any other code in Next.js
// Use it to polyfill globals for server-side compatibility

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Polyfill 'self' for packages that expect browser environment
    if (typeof global !== 'undefined' && typeof (global as any).self === 'undefined') {
      (global as any).self = global;
    }

    // Polyfill 'window' with mock location object
    if (typeof (global as any).window === 'undefined') {
      (global as any).window = {
        ...global,
        location: {
          protocol: 'http:',
          hostname: 'localhost',
          port: '3000',
          pathname: '/',
          search: '',
          hash: '',
          href: 'http://localhost:3000/',
          origin: 'http://localhost:3000',
        },
      };
    }

    // Polyfill DOM elements for framer-motion with event listener support
    const createMockElement = () => {
      return class MockElement {
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() { return true; }
        getAttribute() { return null; }
        setAttribute() {}
        removeAttribute() {}
        hasAttribute() { return false; }
      };
    };

    if (typeof (global as any).SVGElement === 'undefined') {
      (global as any).SVGElement = createMockElement();
    }
    if (typeof (global as any).HTMLElement === 'undefined') {
      (global as any).HTMLElement = createMockElement();
    }
    if (typeof (global as any).Element === 'undefined') {
      (global as any).Element = createMockElement();
    }
    if (typeof (global as any).Node === 'undefined') {
      (global as any).Node = createMockElement();
    }

    console.log('✅ Server polyfills loaded (self, window, SVGElement, HTMLElement, Element)');
  }
}

