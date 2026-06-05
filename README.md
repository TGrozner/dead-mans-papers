# Dead Man's Papers

Prototype web narratif inspiré par les principes de l'enquête existentielle, avec une présentation top-down simple façon RPG portable.

## Lancer

```bash
npm install
npm run dev
```

## Vertical Slice

- Quartier portuaire compact.
- Personnage joueur: Noé Caradec, flic fonctionnel par fragments, surnommé Deux Verres.
- Incident central: un corps dans le container 17 porte les papiers du joueur.
- Mystère municipal: le corps semble lié à la chambre froide et aux registres de la ville.
- Deux PNJ: la lieutenante Varga et Mado La Grue.
- Huit voix internes définies comme personnages systémiques.
- La Dose, parasite non-stat lié à l'alcool, aux calmants et à la dette médicale.
- Choix de posture identitaire devant les papiers du mort.
- Passifs de voix: dialogue, exploration et indice.
- Six orbs d'observation: visibles ou déclenchés par proximité.
- Dialogues stockés dans `src/content/dialogues.json`.
- Passifs stockés par contexte dans `src/content/locations/harbor/*.passives.json`.
- Orbs stockés dans `src/content/locations/harbor/orbs.json`.
- Checks actifs en d6 + voix contre difficulté.
- Échecs écrits comme des scènes, avec indices ou conséquences.
- Sauvegarde locale via `localStorage`.

## Contrôles

- Déplacement: flèches, ZQSD ou WASD.
- Interaction proche: bouton contextuel, Espace, Entrée ou E.

## Direction v0

Le monde doit rester petit mais dense. Les voix internes ne sont pas des bonus abstraits: elles produisent des idées, se trompent, flattent, paniquent et ouvrent parfois des options. Les checks actifs doivent arriver comme des nœuds dramatiques, et l'échec doit donner du contenu au lieu de bloquer le joueur.

Le ton est plus cru et social que romantique: alcool fort, calmants, papiers, honte publique, dette, chambre froide municipale. La question n'est pas seulement qui est mort, mais comment une ville, un corps et un dossier peuvent décider que tu es mort avant toi.
