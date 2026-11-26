import { HTTP_URL } from "./serverUrl.js";
export interface AuthSuccess {
  token: string;
  username: string;
  email: string;
  tag: string;
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

export function loginGoogle(
  credential: string,
  anonId: string,
): Promise<AuthSuccess | AuthFailure> {
  return postAuth("/auth/google", { credential, anonId });
}

/** `undefined` quand la connexion Google n'est pas configurée sur le serveur. */
export async function fetchGoogleClientId(): Promise<string | undefined> {
  try {
    const response = await fetch(`${HTTP_URL}/auth/config`);
    if (!response.ok) return undefined;
    const data = (await response.json()) as { googleClientId?: string | null };
    return data.googleClientId ?? undefined;
  } catch {
    return undefined;
  }
}

export function login(email: string, password: string): Promise<AuthSuccess | AuthFailure> {
  return postAuth("/auth/login", { email, password });
}
