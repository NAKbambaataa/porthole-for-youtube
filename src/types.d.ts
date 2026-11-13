// Document Picture-in-Picture isn't in TypeScript's bundled DOM lib yet.
// Named differently from the lib's types to avoid merge conflicts if it lands.
interface PortholeDocPipOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface PortholeDocPipApi {
  requestWindow(options?: PortholeDocPipOptions): Promise<Window>;
  readonly window: Window | null;
}
