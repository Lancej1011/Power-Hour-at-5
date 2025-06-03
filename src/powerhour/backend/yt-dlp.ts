// In Electron, this is now a preload/IPC call, not a direct Node.js call.
// This file can serve as a frontend utility if you want to abstract the call further.

export async function fetchYoutubeMeta(url: string) {
  if ((window as any).electronAPI && (window as any).electronAPI.fetchYoutubeMeta) {
    return await (window as any).electronAPI.fetchYoutubeMeta(url);
  }
  throw new Error("yt-dlp integration is not available.");
}