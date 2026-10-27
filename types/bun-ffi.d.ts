// Minimal module declarations for `bun:ffi` used by desktop initialization.

declare module 'bun:ffi' {
  export const FFIType: Record<string, string | number>
  export function dlopen(
    path: string,
    symbols: Record<string, unknown>,
  ): {
    symbols: Record<string, any>
    close(): void
  }
  export function ptr(val: unknown): unknown
}
