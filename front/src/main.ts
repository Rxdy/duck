import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router.js";
import { useSettingsStore } from "./store/settingsStore.js";
// Jeu d'icônes de l'interface (voir components/atoms/IconButton.vue).
import "remixicon/fonts/remixicon.css";
import "./style.css";

const app = createApp(App);
app.use(createPinia()).use(router);

// Le thème enregistré doit être posé sur le document avant le premier rendu,
// sinon l'écran s'affiche en sombre puis bascule sous les yeux du joueur.
useSettingsStore().applyStoredTheme();

app.mount("#app");
