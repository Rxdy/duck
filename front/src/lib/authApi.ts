const WS_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";
// "ws://" -> "http://", "wss://" -> "https://", voir lib/mapsApi.ts.
const HTTP_URL = WS_URL.replace(/^ws/, "http");

export interface AuthSuccess {
  token: string;
  username: string;
  email: string;
}

export interface AuthFailure {
  error: string;
}

async function postAuth(path: string, body: unknown): Promise<AuthSuccess | AuthFailure> {
  try {
    const response = await fetch(`${HTTP_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as AuthSuccess | AuthFailure;
    return response.ok
      ? data
      : { error: (data as AuthFailure).error ?? "Une erreur est survenue." };
  } catch {
    return { error: "Impossible de contacter le serveur." };
  }
}

export function register(
  username: string,
  email: string,
  password: string,
  anonId: string,
): Promise<AuthSuccess | AuthFailure> {
  return postAuth("/auth/register", { username, email, password, anonId });
}

/** `identifier` : pseudo ou email, les deux sont uniques et acceptés indifféremment. */
export function login(identifier: string, password: string): Promise<AuthSuccess | AuthFailure> {
  return postAuth("/auth/login", { identifier, password });
}
