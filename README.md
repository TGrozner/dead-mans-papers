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
- Personnage joueur: Zinédine Saïdi, médiateur sécurité municipale fonctionnel par fragments, surnommé Le Gobelet.
- Incident central: Ahmed Berrichi, vieux locataire officiellement disparu du relogement, est retrouvé dans le coffre d'un utilitaire municipal avec les papiers du joueur plantés sur lui.
- Progression v0: le coffre révèle d'abord une odeur et une forme; les papiers n'arrivent qu'après une fouille physique risquée.
- Mystère municipal: une page arrachée ouvre des pistes sales: caméra P2 morte, badge chantier, Dr Nadia Hami, et Sofiane qui a senti l'odeur du coffre malgré son joint.
- Quatre PNJ clés: Karine Leduc, responsable rénovation urbaine; Amar Boudiaf, gardien d'immeuble; Sofiane Zekraoui, témoin de palissade qui fume du shit; Dr Nadia Hami, médecin municipal encore hors champ.
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
- Sauvegarde locale via `localStorage`.

## Contrôles

- Déplacement: flèches, ZQSD, WASD ou toucher la scène pour marcher vers un point.
- Interaction: près d'un élément, utiliser le bouton contextuel, Espace, Entrée ou E.
- Mobile: toucher un élément important rapproche Zinédine et sélectionne l'action, mais n'ouvre plus directement de scène.
- Mobile: ouvrir une surface narrative demande ensuite le bouton contextuel `!`, ou un second tap volontaire sur la même cible une fois Zinédine à portée.
- Mobile: la scène est pensée en approcher-puis-agir plutôt qu'en joystick virtuel; les zones longues scrollent à l'intérieur du dossier ou du dialogue, pas dans toute la page.
- Debug mobile/dev: ajouter `?debug=1` à l'URL affiche les derniers taps, cibles actives, destinations et projections de mouvement.
- Mobile: la caméra zoome légèrement et suit Zinédine pour rendre les zones cliquables plus lisibles.
- Mobile: les pensées flottantes sont compactes, limitées à la plus récente et disparaissent automatiquement pour éviter de masquer la carte.

## Notes Dev

- Les fichiers source et narratifs restent en UTF-8: `.ts`, `.css`, `.html`, `.json`, `.md`.
- Garder les accents dans les dialogues français; vérifier `Mémoire`, `Réussi`, `à`, `œ`, `É` dans le navigateur plutôt que dans l'affichage PowerShell.

## Direction v0

Le monde doit rester petit mais dense. Les voix internes ne sont pas des bonus abstraits: elles produisent des idées, se trompent, flattent, paniquent et ouvrent parfois des options. Les objets importants sont des surfaces dialoguées, pas seulement des indices. Les checks actifs doivent arriver comme des nœuds dramatiques, et l'échec doit donner du contenu au lieu de bloquer le joueur.

La règle actuelle est clarté avant cryptage: chaque scène importante doit dire ce qui se passe, ce que le corps de Zinédine abîme, et quelle piste concrète s'ouvre. Les images restent possibles, mais elles doivent servir une information lisible.

Le ton validé est raw, social, énervé: alcool, calmants, shit, tremblements, dette médicale, odeurs, honte publique, voix courtes et présentes. Karine renomme la merde pour la rendre municipale, La Dose vend de la stabilité, Sofiane fume au mauvais endroit et dit parfois la vérité. L'addiction n'est pas une couleur de fond: c'est une pression de gameplay, une dette sociale et une arme que les PNJ peuvent retourner contre Zinédine.

La question n'est pas seulement qui est mort, mais comment une ville, un corps et un dossier peuvent décider que tu es mort avant toi.
