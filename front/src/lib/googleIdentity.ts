const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export interface GoogleIdentity {
  initialize(options: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
}

let loading: Promise<GoogleIdentity> | undefined;

/**
 * Charge le script officiel de Google, à la demande : seules les pages de
 * connexion appellent Google, et seulement si la connexion est configurée.
 */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const google = (window as { google?: { accounts: { id: GoogleIdentity } } }).google;
      if (google) resolve(google.accounts.id);
      else reject(new Error("Script Google chargé sans API."));
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Script Google injoignable."));
    };
    document.head.append(script);
  });
  return loading;
}
