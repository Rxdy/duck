import { defineStore } from "pinia";
import { fetchFriends, type FriendLists } from "../lib/friendsApi.js";

const empty = (): FriendLists => ({ friends: [], incoming: [], outgoing: [] });

/** Partagé entre la page Amis et la pastille de l'en-tête (demandes reçues). */
export const useFriendsStore = defineStore("friends", {
  state: () => ({ ...empty(), loaded: false, failed: false }),
  actions: {
    async refresh(token: string | undefined) {
      if (!token) {
        Object.assign(this, empty(), { loaded: false, failed: false });
        return;
      }
      const lists = await fetchFriends(token);
      this.failed = !lists;
      if (lists) Object.assign(this, lists, { loaded: true });
    },
  },
});
