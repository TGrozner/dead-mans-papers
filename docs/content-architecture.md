# Architecture de contenu

Le contenu narratif doit rester modulaire par contexte, pas seulement par type abstrait.

## Principe

Une zone compacte peut être profonde si ses contenus sont séparés par surfaces narratives:

- dialogue
- passifs de voix
- orbs d'exploration
- objets d'inventaire
- pensées
- rêves
- parasites non-stat

Pour le vertical slice, les passifs sont déjà attachés à `location + subject + channel`.

## Structure actuelle

```text
src/content/
  dialogues.json
  voices.json
  parasites.json
  locations/
    miroirs/
      utility-van.passives.json
      body.passives.json
      leduc.passives.json
      objects.passives.json
      residents.passives.json
      orbs.json
```

## Modèle de passif

Chaque passif contient:

- `id`
- `contextId`
- `location`
- `subject`
- `channel`: `exploration`, `dialogue` ou `clue`
- `voice`
- `minScore`
- `maxScore` optionnel pour les antipassifs
- `parasite` optionnel pour La Dose
- `requiresFlag` / `hiddenWhenFlag` optionnels
- `once`
- `priority`
- `display`
- `trigger`
- `text`
- `optionalEffects`

## État narratif

`GameState` contient maintenant:

- `identityPosture`: `accept`, `refuse`, `perform` ou `defile`
- flags de posture, par exemple `identity_accept`
- `triggeredOrbs`
- `triggeredPassives`
- `completedChecks`, avec voix principale et voix de soutien optionnelle
- scores des huit voix stat

La Dose est séparée des scores. Elle peut apparaître via `parasite: "dose"` sur un nœud de dialogue et un flag comme `dose_heard`.

## Direction future

Les prochains contenus peuvent suivre le même modèle:

```text
src/content/locations/miroirs/utility-van.dialogue.json
src/content/locations/miroirs/leduc.dialogue.json
src/content/locations/miroirs/amar.dialogue.json
src/content/locations/miroirs/orbs.json
src/content/inventory/*.json
src/content/thoughts/*.json
src/content/dreams/*.json
src/content/parasites/*.json
```

Si un compagnon récurrent arrive plus tard, il doit être traité comme un canal contextuel transversal, pas seulement comme un PNJ de dialogue.

## Roadmap Systèmes

### Context Matrix

Chaque contexte important déclare ses voix disponibles et ses surfaces, plutôt qu'un gros fichier global. Exemple: `miroirs/utility-van`, `miroirs/leduc`, `miroirs/residents`.

### Orbs / Observations

Créer une surface distincte des dialogues:

- `glance`: proximité ou lecture rapide
- `inspect`: interaction volontaire
- `revisit`: nouveau texte après flag ou indice
- `contradiction`: une voix corrige ou contredit une lecture précédente

Pour la v0 élargie: téléphone fissuré, utilitaire, Ahmed, caméra HS, local technique, néon/flaque, voix derrière palissade.

### Contextual Voice Packs

Une même voix doit changer de comportement selon le sujet. `Le Présage` sur l'utilitaire peut être une paranoïa municipale; sur Karine Leduc, une liturgie de communication; sur le néon, une mémoire qui clignote dans du béton humide.

### Flow Variants

Éviter un seul graphe saturé de flags. Quand l'état du monde change, créer des variantes contextuelles:

- `miroirs/day1_body-found`
- `miroirs/day1_after-papers`
- `miroirs/day1_after-amar-badge`
- `miroirs/day1_identity-defile`

### Thoughts

Prévoir une surface `thoughts` même vide en v0. Exemples possibles:

- L'Homme Administrativement Mort
- Sel De Béton
- Police Du Ridicule
- Les Miroirs Mangent Les Noms

Chaque pensée aurait des conditions de déblocage, une étape de rumination, un payoff narratif, un modificateur léger et de nouveaux passifs.

### Inventory As Dialogue

Les objets importants doivent déclencher des voix. Les papiers du mort sont inspectables comme pseudo-objet, avec lectures par `Le Dossier`, `Le Regard`, `Le Présage`, `La Main Basse` et `La Dose`.

Surfaces actuelles:

- `papers_surface`: papiers, badge, ordonnance.
- `page_surface`: caméra morte, badge chantier, Hami, pli humide.
- `body_read`: Ahmed sans contact immédiat.
- `notebook_absent`: carnet manquant avant la fouille.

### Antipassives

Un antipassif est un passif déclenché par `maxScore`: la voix parle quand elle est trop faible et propose une mauvaise lecture intéressante. Exemple: croire que Karine n'est pas dangereuse parce qu'elle parle bas, ou croire que `Le Gobelet` n'est qu'une blague.

### Addiction States

Pas de jauge visible façon mana. Utiliser des états narratifs discrets:

- `stable`: le corps ment bien.
- `febrile`: tremblements, sueur, voix plus insistantes.
- `dirty`: les PNJ sentent le problème avant d'écouter.
- `in_debt`: certaines personnes peuvent réclamer.
- `falling`: choix humiliants, passifs intrusifs, échecs plus violents.

Dans la v0, ces états doivent être écrits explicitement dans les scènes plutôt que cachés dans l'ambiance. Un tremblement doit pouvoir devenir un risque social, une odeur d'alcool doit pouvoir devenir une arme pour Karine, et une ordonnance doit pouvoir devenir une piste vers Hami.

Règle d'écriture associée: chaque mention de La Dose doit rappeler au moins une chose concrète: alcool, calmants, main stable, sueur, dette médicale, Hami, ou peur d'être vu comme instable.

### Municipal Doctor

La Dr Nadia Hami doit devenir un futur nœud central:

- médecin du centre municipal de santé
- prédateur doux
- prescriptions et certificats
- dette médicale
- lien possible avec un dépôt, un local sanitaire ou une morgue provisoire
- vocabulaire de La Dose: stabiliser, réguler, suivi, juste assez, main stable

### Companion Channel

Un compagnon éventuel doit être un canal transversal contextuel: capable de contredire les voix, ramener au réel, ouvrir ou bloquer des options, et réagir aux échecs.
