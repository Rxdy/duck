import { createRouter, createWebHistory } from "vue-router";
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
        { path: "creatif", name: "creative", component: () => import("./pages/Creative.vue") },
        {
          path: "creatif/cartes",
          name: "my-maps",
          component: () => import("./pages/MyMaps.vue"),
        },
        {
          path: "creatif/test",
          name: "test-game",
          component: () => import("./pages/TestGame.vue"),
        },
        { path: "credits", name: "credits", component: () => import("./pages/Credits.vue") },
        { path: "options", name: "options", component: () => import("./pages/Options.vue") },
        {
          path: "canard",
          name: "duck-profile",
          component: () => import("./pages/DuckProfile.vue"),
        },
      ],
    },
  ],
});

export default router;
