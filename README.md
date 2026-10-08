# GitHub : copier le lien titré

Extension Firefox qui ajoute, après le titre d'une issue ou d'une pull request GitHub, un bouton qui copie un lien vers la page, dont le texte est ce titre.

Collé dans une messagerie, un courriel ou un document, le résultat est un lien cliquable qui affiche le titre plutôt que l'adresse. Collé dans un champ de texte brut, c'est le même lien en markdown : `[titre](adresse)`.

## Installation

L'extension demande Firefox 140 ou une version ultérieure.

1. Téléchargez le fichier `.xpi` de la dernière version depuis la page [Releases](https://github.com/guillaume-brialon/github-copy-link/releases).
2. Ouvrez-le dans Firefox et acceptez l'installation.

Si Firefox enregistre le fichier au lieu de l'installer, ouvrez `about:addons`, cliquez sur la roue dentée, puis sur « Installer un module depuis un fichier… ».

## Utilisation

Le bouton, une icône de lien, apparaît après le numéro et le bouton d'édition du titre :

- sur la page d'une issue ;
- sur la page d'une pull request ;
- dans le panneau latéral d'une issue ouverte depuis un projet.

Un clic copie le lien, et l'icône devient une coche verte pendant une seconde et demie. L'adresse copiée est celle de l'issue ou de la pull request elle-même, sans onglet (`/files`, `/commits`), paramètre ni ancre.

L'extension ne fait aucun appel réseau et ne collecte aucune donnée.

## Développement

L'extension tient en trois fichiers, sans étape de build :

- `manifest.json` déclare l'extension ;
- `content.js` insère le bouton et copie le lien ;
- `content.css` ajuste l'espacement du bouton et les couleurs de l'icône.

Pour essayer une modification, ouvrez `about:debugging#/runtime/this-firefox`, cliquez sur « Charger un module complémentaire temporaire… » et choisissez `manifest.json`. Après chaque changement, cliquez sur « Actualiser » sous l'extension, puis rechargez la page GitHub.

Le bouton et son infobulle reprennent les classes des boutons icônes de GitHub, lues sur la page. Si GitHub les renomme, le bouton retombe sur un style propre à l'extension et sur l'infobulle du navigateur.

## Publier une version

Firefox n'installe durablement qu'une extension signée par Mozilla.

1. Augmentez `version` dans `manifest.json`.
2. Construisez l'archive :

   ```bash
   mkdir -p web-ext-artifacts && zip -j web-ext-artifacts/github-copy-link.zip manifest.json content.js content.css
   ```

3. Soumettez l'archive sur [addons.mozilla.org](https://addons.mozilla.org/developers/) en distribution « On your own », puis téléchargez le `.xpi` signé.
4. Joignez le `.xpi` à une nouvelle release de ce dépôt.

## Licences tierces

Les icônes viennent d'[Octicons](https://github.com/primer/octicons), © GitHub, Inc., sous [licence MIT](https://github.com/primer/octicons/blob/main/LICENSE).
