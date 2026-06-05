# Mini GDD - Dead Man's Papers

## Pitch

Noé Caradec, flic fonctionnel par fragments, se réveille dans un quartier portuaire pauvre. Un corps est retrouvé dans le container 17. Dans les poches du mort: ses papiers.

Le problème immédiat n'est pas seulement de savoir qui est mort. C'est de prouver que Noé ne l'est pas, tout en cachant assez longtemps l'alcool, les calmants, les dettes et les tremblements pour qu'on le laisse enquêter.

## Personnage

- Nom: Noé Caradec.
- Surnom humiliant dans le port: Deux Verres.
- État: alcool fort bon marché, calmants, mémoire cassée mais gestes encore fonctionnels.
- Passé social: petites dettes, absences couvertes, certificats, faveurs administratives, dépendance semi-officielle.
- Objectif initial: rester debout, rester crédible, comprendre pourquoi la ville a déplacé un mort avec ses papiers.

## Ton

Tragicomédie sale: social et corporel dans la même phrase, politique et honteux dans la même scène, drôle parce que les gens cruels ont souvent une bonne mémoire.

L'addiction n'est pas romantique. Elle est utile, moche, transactionnelle, et tout le monde la connaît un peu trop.

## Boucle

Explorer, parler, inspecter, écouter les voix internes, subir La Dose, tenter des checks, accumuler des indices et des contradictions.

## Identité

Le choix d'identité arrive devant les papiers du mort. Le joueur lit `Noé Caradec`, puis choisit comment porter ce nom:

- Accepter: c'est mon nom jusqu'à preuve du contraire.
- Refuser: ce nom est peut-être une cage.
- Jouer: je peux faire semblant d'être lui.
- Salir: qu'ils le disent encore, je veux voir ce qu'il vaut quand il pue.

Système actuel: `identityPosture` sauvegardé, flags de posture, bump léger d'une voix.

## Passifs v1

- Déclenchement si la voix atteint le score minimum.
- Chaque passif ne se déclenche qu'une fois.
- Les passifs de dialogue apparaissent dans la boîte de dialogue.
- Les passifs d'exploration et d'indice apparaissent en toast durable.
- Les passifs sont attachés à un contexte: location + sujet + canal.
- Ton: cru, drôle, social, corporel, avec des touches inquiétantes.

## Orbs v0

- Orbs visibles: container, cadavre, grue, entrepôt municipal.
- Orbs de proximité: mer, dockers hors champ.
- Les orbs visibles s'ouvrent dans une boîte courte.
- Les orbs de proximité apparaissent en toast durable.
- Les orbs peuvent appliquer des effets légers et déclencher des passifs.

## Checks v0

- Les checks ne sont pas relançables.
- Avant tentative, le choix affiche `voix: d6 + score vs difficulté`.
- Après tentative, le choix affiche le résultat mémorisé.
- Le bandeau de résultat affiche le détail du jet.
- Cliquer un check déjà tenté rejoue la scène du résultat mémorisé.

## Voix internes v0

- Le Dossier: preuves, papiers, procédure, mensonges officiels.
- Le Regard: honte, réputation, gêne, posture sociale.
- Le Ventre: faim, corps, fatigue, manque matériel.
- Le Nerf: danger, colère, menace, fuite.
- La Main Basse: gestes sales, fouille, crochetage, coups, vols.
- Les Bouches: rumeurs, surnoms, accents, mensonges du port.
- Le Présage: signes, religion, paranoïa, poésie sale.
- Le Sel: mémoire, noyade, trauma, déjà-vu.

## Parasite

La Dose est une voix non-stat. Elle ne gagne pas de points; elle gagne de la place.

Style: commerciale, intime, obscène. Elle parle de stabiliser, réguler, garder la main stable, faire tourner la machine. Elle protège le futur médecin municipal parce qu'il tient probablement la dette la plus dangereuse: prescriptions, certificats, suivi et dépendance.

## Règle d'écriture

Chaque scène importante doit contenir:

- une information utile
- une émotion embarrassante
- une lecture politique ou sociale
- une voix interne qui a tort de façon intéressante
- un choix raisonnable
- un choix indigne
- un choix bizarre mais révélateur
- au moins un échec écrit comme une vraie scène

## Mystère

Le corps du container vient probablement de la chambre froide municipale. Ce n'est pas seulement une mort cachée: c'est une mort déplacée avec les moyens de la ville.

Le joueur est-il la victime, l'usurpateur, le témoin, ou le mensonge encore debout ?
