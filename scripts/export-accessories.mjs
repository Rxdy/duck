/**
 * Écrit la liste des accessoires à gagner pour le serveur (back/src/accessories.json), à partir du
 * catalogue du jeu. À relancer après tout ajout : `make accessories`. Un test échoue sinon.
 */
import { writeFileSync } from "node:fs";
import { ACCESSOIRES } from "../front/src/lib/accessories/accessoires.js";

const list = ACCESSOIRES.filter((a) => !a.reserve).map(({ id, emplacement }) => ({ id, emplacement }));
writeFileSync(
  new URL("../back/src/accessories.json", import.meta.url),
  "[\n" + list.map((a) => "  " + JSON.stringify(a)).join(",\n") + "\n]\n",
);
console.log(`${list.length} accessoires`);
