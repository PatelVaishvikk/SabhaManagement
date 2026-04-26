export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchYouTubeMetadata(url: string) {
  const youtubeId = extractYouTubeId(url);
  if (!youtubeId) {
    throw new Error("Invalid YouTube URL");
  }

  const fallback = {
    youtubeId,
    title: "YouTube video",
    thumbnailUrl: getYouTubeThumbnail(youtubeId),
    duration: 0
  };

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      next: { revalidate: 3600 }
    });

    if (!response.ok) return fallback;

    const data = (await response.json()) as { title?: string; thumbnail_url?: string; author_name?: string };

    return {
      youtubeId,
      title: data.title ?? fallback.title,
      thumbnailUrl: data.thumbnail_url ?? fallback.thumbnailUrl,
      authorName: data.author_name,
      duration: 0
    };
  } catch {
    return fallback;
  }
}
