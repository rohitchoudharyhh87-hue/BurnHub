type JsonBody = object;

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? body.detail
        : undefined;
    super(typeof detail === "string" ? detail : `Request failed (${status})`);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body: JsonBody | null = null,
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body === null ? undefined : { "Content-Type": "application/json" },
    body: body === null ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: JsonBody) =>
  request<T>("POST", path, body ?? null);
export const apiPut = <T>(path: string, body?: JsonBody) =>
  request<T>("PUT", path, body ?? null);
export const apiPatch = <T>(path: string, body?: JsonBody) =>
  request<T>("PATCH", path, body ?? null);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);

export async function apiStream(
  path: string,
  body: unknown,
  onDelta: (text: string) => void,
): Promise<void> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const errorBody: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, errorBody);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const line = message.trim();
      if (!line.startsWith("data:")) continue;
      const payload: unknown = JSON.parse(line.slice(5).trim());
      if (typeof payload !== "object" || payload === null) continue;
      if ("error" in payload && typeof payload.error === "string") {
        throw new ApiError(500, { detail: payload.error });
      }
      if ("t" in payload && typeof payload.t === "string") onDelta(payload.t);
    }
  }
}
