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
    harbor/
      container.passives.json
      body.passives.json
      varga.passives.json
      dockers.passives.json
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
- scores des huit voix stat

La Dose est séparée des scores. Elle peut apparaître via `parasite: "dose"` sur un nœud de dialogue et un flag comme `dose_heard`.

## Direction future

Les prochains contenus peuvent suivre le même modèle:

```text
src/content/locations/harbor/container.dialogue.json
src/content/locations/harbor/mado.dialogue.json
src/content/locations/harbor/orbs.json
src/content/inventory/*.json
src/content/thoughts/*.json
src/content/dreams/*.json
src/content/parasites/*.json
```

Si un compagnon récurrent arrive plus tard, il doit être traité comme un canal contextuel transversal, pas seulement comme un PNJ de dialogue.

## Roadmap Systèmes

### Context Matrix

Chaque contexte important déclare ses voix disponibles et ses surfaces, plutôt qu'un gros fichier global. Exemple: `harbor/container`, `harbor/varga`, `harbor/dockers`.

### Orbs / Observations

Créer une surface distincte des dialogues:

- `glance`: proximité ou lecture rapide
- `inspect`: interaction volontaire
- `revisit`: nouveau texte après flag ou indice
- `contradiction`: une voix corrige ou contredit une lecture précédente

Pour la v0 élargie: container, cadavre, grue, dockers hors champ, mer, entrepôt municipal.

### Contextual Voice Packs

Une même voix doit changer de comportement selon le sujet. `Le Présage` sur le container peut être une paranoïa religieuse et administrative; sur Varga, une bureaucratie sacrée; sur la mer, une mémoire qui prend l'eau.

### Flow Variants

Éviter un seul graphe saturé de flags. Quand l'état du monde change, créer des variantes contextuelles:

- `harbor/day1_body-found`
- `harbor/day1_after-papers`
- `harbor/day1_after-mado-salt`
- `harbor/day1_identity-defile`

### Thoughts

Prévoir une surface `thoughts` même vide en v0. Exemples possibles:

- L'Homme Administrativement Mort
- Sel de Preuve
- Police du Ridicule
- Le Port Mange Les Noms

Chaque pensée aurait des conditions de déblocage, une étape de rumination, un payoff narratif, un modificateur léger et de nouveaux passifs.

### Inventory As Dialogue

Les objets importants doivent déclencher des voix. Les papiers du mort doivent devenir inspectables comme pseudo-objet, avec lectures par `Le Dossier`, `Le Regard`, `Le Présage`, `La Main Basse` et `La Dose`.

### Addiction States

Pas de jauge visible façon mana. Utiliser des états narratifs discrets:

- `stable`: le corps ment bien.
- `febrile`: tremblements, sueur, voix plus insistantes.
- `dirty`: les PNJ sentent le problème avant d'écouter.
- `in_debt`: certaines personnes peuvent réclamer.
- `falling`: choix humiliants, passifs intrusifs, échecs plus violents.

### Municipal Doctor

Le médecin municipal doit devenir un futur nœud central:

- prédateur doux
- prescriptions et certificats
- dette médicale
- lien avec la chambre froide municipale
- vocabulaire de La Dose: stabiliser, réguler, suivi, juste assez, main stable

### Companion Channel

Un compagnon éventuel doit être un canal transversal contextuel: capable de contredire les voix, ramener au réel, ouvrir ou bloquer des options, et réagir aux échecs.
