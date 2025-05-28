declare module '@ffmpeg/ffmpeg' {
  export function createFFmpeg(options?: { log?: boolean }): {
    isLoaded: () => boolean;
    load: () => Promise<void>;
    FS: (cmd: string, ...args: any[]) => any;
    run: (...args: string[]) => Promise<void>;
  };
  export function fetchFile(file: File): Promise<Uint8Array>;
} 