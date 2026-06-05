# Mini GDD - Dead Man's Papers

## Pitch

Morad Saïdi, médiateur sécurité municipale fonctionnel par fragments, se réveille dans le parking P2 des Miroirs. Un corps est retrouvé dans le coffre d'un utilitaire de chantier floqué `Renouvellement Urbain`. Dans les poches du mort: ses papiers.

Le problème immédiat n'est pas seulement de savoir qui est mort. C'est de prouver que Morad ne l'est pas, tout en cachant assez longtemps l'alcool, les calmants, les dettes et les tremblements pour qu'on le laisse regarder discrètement avant que ça parte en procédure.

## Cadre

- Quartier fictif: Les Miroirs.
- Lieu v0: Parking P2.
- Ambiance: parking semi-enterré, néons froids, béton humide, flaques, palissades de chantier, rubalise, caméras HS, local technique, affiches de relogement, poussière de plâtre.
- Slogan municipal: `Demain commence ici.`
- Type de ville: cité de ville nouvelle en rénovation interminable, sans lieu réel nommé.

## Personnage

- Nom: Morad Saïdi.
- Surnom humiliant dans le quartier: Le Gobelet.
- Fonction: médiateur sécurité municipale.
- Statut: pas exactement flic, pas exactement social, pas exactement propre.
- Outils sociaux: badge flou, portable connu de tous, accès aux cages, parkings, caméras, locaux et habitudes.
- État: alcool fort bon marché, calmants, mémoire cassée mais gestes encore fonctionnels.
- Objectif initial: rester debout, rester crédible, comprendre pourquoi un service municipal a déplacé un mort avec ses papiers.

## Personnages v0

- Karine Leduc: responsable rénovation urbaine. Elle cherche un périmètre, une communication, une formulation qui transforme un cadavre en incident maîtrisé.
- Amar Boudiaf: gardien d'immeuble. Mémoire vivante de la dalle; il connaît les caves, badges, familles, embrouilles, accès, locaux techniques, caméras mortes, relogements et rancunes.
- Dr Nadia Hami: médecin du centre municipal de santé, future présence centrale. Douce, précise, clinique, intouchable; elle connaît les dosages, renouvellements, certificats et tremblements.

## Ton

Tragicomédie sale: social et corporel dans la même phrase, administratif et honteux dans la même scène, drôle parce que les gens cruels connaissent les bons surnoms.

Pas de romantisme portuaire. La poésie vient du contraste entre langue municipale propre et corps abîmés sous néons.

## Boucle

Explorer, parler, inspecter, écouter les voix internes, subir La Dose, tenter des checks, accumuler des indices et des contradictions.

## Identité

Le choix d'identité arrive devant les papiers du mort. Le joueur lit `Morad Saïdi`, puis choisit comment porter ce nom:

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

- Orbs visibles: utilitaire municipal, corps, caméra HS, local technique.
- Orbs de proximité: néon/flaque, voix derrière la palissade.
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
- Les Bouches: rumeurs, surnoms, accents, mensonges du quartier.
- Le Présage: signes, religion, paranoïa, poésie sale.
- Le Sel: mémoire chimique, sueur, larmes, sel de déneigement, béton humide, déjà-vu.

## Parasite

La Dose est une voix non-stat. Elle ne gagne pas de points; elle gagne de la place.

Style: commerciale, intime, obscène. Elle parle de stabiliser, réguler, garder la main stable, faire tourner la machine. Elle protège la future Dr Nadia Hami parce qu'elle tient probablement la dette la plus dangereuse: prescriptions, certificats, suivi et dépendance semi-officielle.

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

Le corps dans l'utilitaire n'a pas seulement été caché: il a été mal déplacé par un circuit municipal. Dépôt, local sanitaire, centre municipal de santé, morgue provisoire ou autre nom propre pour une chose sale.

Le joueur est-il la victime, l'usurpateur, le témoin, ou le mensonge encore debout ?
