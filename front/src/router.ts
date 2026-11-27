import { createRouter, createWebHistory } from "vue-router";
import { requiresAccount, signUpFor } from "./lib/access.js";
import { loadSession } from "./lib/session.js";
import AppLayout from "./layouts/AppLayout.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      children: [
        { path: "", name: "home", component: () => import("./pages/Home.vue") },
        { path: "jouer", name: "play", component: () => import("./pages/Play.vue") },
        { path: "jeu", name: "game", component: () => import("./pages/Game.vue") },
        {
          path: "creatif",
          name: "creative-menu",
          component: () => import("./pages/CreativeMenu.vue"),
        },
        {
          path: "creatif/editeur",
          name: "creative",
          component: () => import("./pages/Creative.vue"),
        },
        {
          path: "creatif/cartes",
          name: "my-maps",
          component: () => import("./pages/MyMaps.vue"),
        },
        {
          path: "creatif/galerie",
          name: "gallery",
          component: () => import("./pages/Gallery.vue"),
        },
        {
          path: "creatif/test",
          name: "test-game",
          component: () => import("./pages/TestGame.vue"),
        },
        { path: "classement", name: "ranking", component: () => import("./pages/Ranking.vue") },
        { path: "amis", name: "friends", component: () => import("./pages/Friends.vue") },
        { path: "salon/:code?", name: "lobby", component: () => import("./pages/Lobby.vue") },
        { path: "profil", name: "profile", component: () => import("./pages/Profile.vue") },
        { path: "credits", name: "credits", component: () => import("./pages/Credits.vue") },
        {
          path: "options/:section?",
          name: "options",
          component: () => import("./pages/Options.vue"),
        },
        {
          path: "entrainement",
          name: "training",
          component: () => import("./pages/Training.vue"),
        },
        {
          path: "entrainement/libre",
          name: "training-free",
          component: () => import("./pages/FreeRoam.vue"),
        },
        { path: "inscription", name: "sign-up", component: () => import("./pages/SignUp.vue") },
        { path: "connexion", name: "login", component: () => import("./pages/Login.vue") },
        { path: "compte", name: "account", component: () => import("./pages/Account.vue") },
        {
          path: "canard",
          name: "duck-profile",
          component: () => import("./pages/DuckProfile.vue"),
        },
      ],
    },
  ],
});

router.beforeEach((to) =>
  requiresAccount(to.path) && !loadSession()
    ? signUpFor(to.path === "/amis" ? "amis" : to.path.startsWith("/salon") ? "salon" : "creatif")
    : true,
);

export default router;
