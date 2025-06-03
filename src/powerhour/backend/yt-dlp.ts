import { exec } from "child_process";

export async function fetchYoutubeMeta(url: string): Promise<{
  id: string;
  title: string;
  webpage_url: string;
}> {
  return new Promise((resolve, reject) => {
    exec(
      `yt-dlp --dump-json --no-playlist "${url}"`,
      { maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) return reject(error);
        try {
          const meta = JSON.parse(stdout);
          resolve({
            id: meta.id,
            title: meta.title,
            webpage_url: meta.webpage_url,
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}