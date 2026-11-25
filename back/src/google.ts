import { OAuth2Client } from "google-auth-library";
import type { GoogleProfile } from "./auth.js";

const client = new OAuth2Client();

/**
 * Vérifie le jeton remis au navigateur par Google : signature, expiration et
 * destinataire (notre identifiant client, sinon un jeton obtenu par un autre
 * site ouvrirait un compte ici). `undefined` s'il ne vaut rien.
 *
 * Frontière d'E/S (clés publiques de Google) — non testée unitairement.
 */
export async function verifyGoogleCredential(
  credential: string,
  clientId: string,
): Promise<GoogleProfile | undefined> {
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return undefined;
    return { sub: payload.sub, email: payload.email, name: payload.name ?? "" };
  } catch {
    return undefined;
  }
}
