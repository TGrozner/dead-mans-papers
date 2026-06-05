# Dead Man's Papers

Prototype web narratif inspiré par les principes de l'enquête existentielle, avec une présentation top-down simple façon RPG portable.

## Lancer

```bash
npm install
npm run dev
```

## Vertical Slice

- Quartier fictif: Les Miroirs.
- Lieu jouable: Parking P2, parking semi-enterré d'une cité en rénovation interminable.
- Personnage joueur: Morad Saïdi, médiateur sécurité municipale fonctionnel par fragments, surnommé Le Gobelet.
- Incident central: Ahmed Berrichi, vieux locataire officiellement disparu du relogement, est retrouvé dans le coffre d'un utilitaire municipal avec les papiers du joueur plantés sur lui.
- Mystère municipal: une page arrachée ouvre trois pistes sales: caméra P2 morte, badge chantier, Dr Nadia Hami.
- Trois PNJ clés: Karine Leduc, responsable rénovation urbaine; Amar Boudiaf, gardien d'immeuble; Dr Nadia Hami, médecin municipal encore hors champ.
- Huit voix internes définies comme personnages systémiques.
- La Dose, parasite non-stat lié à l'alcool, aux calmants et à la dette médicale.
- Choix de posture identitaire devant les papiers du mort.
- Passifs de voix: dialogue, exploration et indice.
- Antipassifs: mauvaises lectures quand une voix est trop basse.
- Surfaces objet dialoguées: papiers de Morad, badge, ordonnance, page arrachée.
- Sept orbs d'observation: visibles ou déclenchés par proximité, dont le téléphone fissuré et ses 12 appels manqués.
- Dialogues stockés dans `src/content/dialogues.json`.
- Passifs stockés par contexte dans `src/content/locations/miroirs/*.passives.json`.
- Orbs stockés dans `src/content/locations/miroirs/orbs.json`.
- Passifs d'objets stockés dans `src/content/locations/miroirs/objects.passives.json`.
- Checks actifs en d6 + une ou deux voix contre difficulté.
- Échecs écrits comme des scènes, avec indices ou conséquences.
- Sauvegarde locale via `localStorage`.

## Contrôles

- Déplacement: flèches, ZQSD, WASD ou toucher le sol pour marcher vers un point.
- Interaction: toucher directement un marqueur `?` / `...` ou un élément important de la scène; près d'un élément, utiliser aussi le bouton contextuel, Espace, Entrée ou E.
- Mobile: la scène est pensée en tap-to-inspect plutôt qu'en joystick virtuel; les zones longues scrollent à l'intérieur du dossier ou du dialogue, pas dans toute la page.
- Mobile: la caméra zoome légèrement et suit Morad pour rendre les zones cliquables plus lisibles.
- Mobile: les pensées flottantes sont compactes, limitées à la plus récente et disparaissent automatiquement pour éviter de masquer la carte.

## Notes Dev

- Les fichiers source et narratifs restent en UTF-8: `.ts`, `.css`, `.html`, `.json`, `.md`.
- Garder les accents dans les dialogues français; vérifier `Mémoire`, `Réussi`, `à`, `œ`, `É` dans le navigateur plutôt que dans l'affichage PowerShell.

## Direction v0

Le monde doit rester petit mais dense. Les voix internes ne sont pas des bonus abstraits: elles produisent des idées, se trompent, flattent, paniquent et ouvrent parfois des options. Les checks actifs doivent arriver comme des nœuds dramatiques, et l'échec doit donner du contenu au lieu de bloquer le joueur.

Le ton est cru, social et corporel: alcool fort, calmants, badges, dossiers, dette, rénovation urbaine, caméras mortes, slogans propres sur béton sale. La question n'est pas seulement qui est mort, mais comment une ville, un corps et un dossier peuvent décider que tu es mort avant toi.
