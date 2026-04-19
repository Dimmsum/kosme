const BASE = process.env.NEXT_PUBLIC_API_URL;

async function getClerkToken(): Promise<string> {
  if (typeof window === "undefined") throw new Error("Not in browser context");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = await ((window as any).Clerk?.session?.getToken() as Promise<string | null> | undefined);
  if (!token) throw new Error("No active session");
  return token;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getClerkToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function handleExpiry(res: Response): void {
  if (res.status === 401) {
    window.dispatchEvent(new Event("session-expired"));
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: await authHeaders() });
  handleExpiry(res);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  handleExpiry(res);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  handleExpiry(res);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getClerkToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  handleExpiry(res);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  handleExpiry(res);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}
