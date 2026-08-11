const WS_URL = import.meta.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";
const HTTP_URL = WS_URL.replace(/^ws/, "http");

export interface OwnedSkin {
  id: string;
  name: string;
  accessory: string;
  equipped: boolean;
}

export async function fetchOwnedSkins(token: string): Promise<OwnedSkin[]> {
  const response = await fetch(`${HTTP_URL}/me/skins`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  return (await response.json()) as OwnedSkin[];
}

export async function equipSkin(token: string, skinId: string): Promise<boolean> {
  const response = await fetch(`${HTTP_URL}/me/equip-skin`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ skinId }),
  });
  return response.ok;
}
