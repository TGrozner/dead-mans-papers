# Dead Man's Papers

Prototype web narratif inspiré par les principes de l'enquête existentielle, avec une présentation top-down simple façon RPG portable.

## Lancer

```bash
nvm use
npm install
npm run dev
```

Le projet cible Node `26.2.0` via `.nvmrc`. Les scripts npm sélectionnent automatiquement cette version via `scripts/with-node.mjs`.

```bash
npm test
```

Pour comparer le rendu local avec GitHub Pages, utiliser le même `base` que la prod:

```bash
nvm use
npm run build:pages
npm run preview:pages -- --host 127.0.0.1 --port 4173
```

Ouvrir ensuite `http://127.0.0.1:4173/dead-mans-papers/`. `npm run dev` reste utile pour développer, mais il sert l'app à la racine `/`, alors que GitHub Pages la sert sous `/dead-mans-papers/`.

## Vertical Slice

- Quartier fictif: Les Miroirs.
- Lieu jouable: Parking P2, parking semi-enterré d'une cité en rénovation interminable.
- Personnage joueur: Zinédine Saïdi, médiateur sécurité municipale fonctionnel par fragments, surnommé Le Gobelet.
- Incident central: Ahmed Berrichi, vieux locataire officiellement disparu du relogement, est retrouvé dans le coffre d'un utilitaire municipal avec les papiers du joueur plantés sur lui.
- Progression v0: le coffre révèle le corps avec les papiers de Zinédine; la fouille physique risquée arrache ensuite la page qui ouvre les vraies pistes.
- Mystère municipal: la page arrachée pointe vers caméra P2 morte, badge chantier, Dr Nadia Hami, et Sofiane qui a senti l'odeur du coffre depuis la palissade.
- Quatre PNJ clés: Karine Leduc, responsable rénovation urbaine; Amar Boudiaf, gardien d'immeuble; Sofiane Zekraoui, témoin de palissade nerveux et utile; Dr Nadia Hami, médecin municipal encore hors champ.
- Huit voix internes définies comme personnages systémiques.
- La Dose, parasite non-stat lié à l'alcool, aux calmants et à la dette médicale.
- Choix de posture identitaire devant les papiers du mort.
- Passifs de voix: dialogue, exploration et indice.
- Antipassifs: mauvaises lectures quand une voix est trop basse.
- Surfaces objet dialoguées: papiers de Zinédine, badge, ordonnance, page arrachée.
- Sept orbs d'observation: visibles ou déclenchés par proximité, dont le téléphone fissuré et ses 12 appels manqués.
- Dialogues stockés dans `src/content/dialogues.json`.
- Passifs stockés par contexte dans `src/content/locations/miroirs/*.passives.json`.
- Orbs stockés dans `src/content/locations/miroirs/orbs.json`.
- Passifs d'objets stockés dans `src/content/locations/miroirs/objects.passives.json`.
- Assets visuels P2 stockés dans `public/assets/miroirs/`, avec une planche de référence et des sprites PNG découpés.
- Checks actifs en d6 + une ou deux voix contre difficulté.
- Échecs écrits comme des scènes, avec indices ou conséquences.
- Options de dialogue déjà ouvertes grisées mais toujours cliquables.
- Options à enjeu mises en avant discrètement quand elles ouvrent une piste, une posture ou un check.
- Dossier actif avec appuis, angles contre Zinédine et pistes chaudes, pour éviter que les indices restent une simple archive.
- Témoins approchables dès le coffre ouvert: sans preuve, Amar et Sofiane résistent au lieu d'être masqués.
- Sauvegarde locale via `localStorage`.

## Contrôles

- Point-and-click: toucher ou cliquer une cible surbrillante ouvre directement son dialogue, son observation ou son écoute.
- Desktop: le survol affiche le bouton contextuel `!`, qui reprend l'action active sans exiger de déplacement.
- Mobile: la scène reste entièrement visible; les zones longues scrollent à l'intérieur du dossier ou du dialogue, pas dans toute la page.
- Debug mobile/dev: ajouter `?debug=1` à l'URL affiche les derniers clics et cibles actives.
- Mobile: les pensées flottantes sont compactes, limitées à la plus récente et disparaissent automatiquement pour éviter de masquer la carte.

## Notes Dev

- Les fichiers source et narratifs restent en UTF-8: `.ts`, `.css`, `.html`, `.json`, `.md`.
- Garder les accents dans les dialogues français; vérifier `Mémoire`, `Réussi`, `à`, `œ`, `É` dans le navigateur plutôt que dans l'affichage PowerShell.
- Standard visuel runtime: scène logique `1280x720` en 16:9. Le master courant `p2-background.png` est en `2560x1440`, avec `p2-foreground.png` transparent aligné pour les occlusions.

## Direction v0

Le monde doit rester petit mais dense. Les voix internes ne sont pas des bonus abstraits: elles produisent des idées, se trompent, flattent, paniquent et ouvrent parfois des options. Les objets importants sont des surfaces dialoguées, pas seulement des indices. Les checks actifs doivent arriver comme des nœuds dramatiques, et l'échec doit donner du contenu au lieu de bloquer le joueur.

La règle actuelle est clarté avant cryptage: chaque scène importante doit dire ce qui se passe, ce que le corps de Zinédine abîme, et quelle piste concrète s'ouvre. Les images restent possibles, mais elles doivent servir une information lisible.

Le ton validé est raw, social, énervé: alcool, calmants, tremblements, dette médicale, odeurs, honte publique, voix courtes et présentes. Karine renomme la merde pour la rendre municipale, La Dose vend de la stabilité, Sofiane se protège derrière la palissade et dit parfois la vérité. L'addiction n'est pas une couleur de fond: c'est une pression de gameplay, une dette sociale et une arme que les PNJ peuvent retourner contre Zinédine.

La question n'est pas seulement qui est mort, mais comment une ville, un corps et un dossier peuvent décider que tu es mort avant toi.
