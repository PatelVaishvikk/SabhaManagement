export async function fetchJson<T>(input: Parameters<typeof fetch>[0], fallback: T, init?: Parameters<typeof fetch>[1]): Promise<T> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) return fallback;

    const text = await response.text();
    if (!text.trim()) return fallback;

    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
