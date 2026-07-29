import { defineStore } from "pinia";
import { login as loginApi, register as registerApi } from "../lib/authApi.js";
import { getOrCreateAnonId } from "../lib/anonId.js";
import { clearSession, loadSession, persistSession, type Session } from "../lib/session.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    session: (loadSession() ?? null) as Session | null,
  }),
  getters: {
    isLoggedIn: (state) => state.session !== null,
  },
  actions: {
    /** `undefined` en cas de succès, sinon le message d'erreur à afficher. */
    async register(username: string, email: string, password: string): Promise<string | undefined> {
      const result = await registerApi(username, email, password, getOrCreateAnonId());
      if ("error" in result) return result.error;
      this.session = result;
      persistSession(result);
      return undefined;
    },
    async login(identifier: string, password: string): Promise<string | undefined> {
      const result = await loginApi(identifier, password);
      if ("error" in result) return result.error;
      this.session = result;
      persistSession(result);
      return undefined;
    },
    logout() {
      this.session = null;
      clearSession();
    },
  },
});
