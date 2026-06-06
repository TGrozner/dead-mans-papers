import fs from 'node:fs'

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))

const dialogues = readJson('src/content/dialogues.json')
const voices = new Set(readJson('src/content/voices.json').map((voice) => voice.id))
const parasites = new Set(readJson('src/content/parasites.json').map((parasite) => parasite.id))
const clueGroups = readJson('src/game/clue-groups.json')
const orbs = readJson('src/content/locations/miroirs/orbs.json')
const passiveFiles = fs
  .readdirSync('src/content/locations/miroirs')
  .filter((fileName) => fileName.endsWith('.passives.json'))
  .sort()
const passives = passiveFiles.flatMap((fileName) => readJson(`src/content/locations/miroirs/${fileName}`))

const errors = []
const emittedClues = new Set()
const emittedFlags = new Set()
const flagReferences = []
const checkIds = new Map()
const orbIds = new Set()
const passiveIds = new Set()
const effectTypes = new Set(['flag', 'clue', 'voice_bump', 'identity_posture'])
const identityPostures = new Set(['accept', 'refuse', 'perform', 'defile'])
const suspiciousMojibakePattern =
  /[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]|[a-zàâçéèêëîïôùûüœ]\?(?=\s+[a-zàâçéèêëîïôùûüœ])|\?[a-zàâçéèêëîïôùûüœ]/u

if (passiveFiles.length === 0) {
  errors.push('No passive files found under src/content/locations/miroirs/*.passives.json')
}

function scanText(value, owner) {
  if (typeof value === 'string') {
    if (value.includes('�') || suspiciousMojibakePattern.test(value)) {
      errors.push(`${owner} contains suspicious mojibake: ${value}`)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanText(item, `${owner}[${index}]`))
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    scanText(nestedValue, `${owner}.${key}`)
  }
}

scanText(dialogues, 'dialogues')
scanText(orbs, 'orbs')
scanText(passives, 'passives')
scanText(clueGroups, 'clueGroups')

validateClueGroups()

function trackEffects(effects = [], owner, property = 'effects') {
  if (!Array.isArray(effects)) {
    errors.push(`${owner} ${property} must be an array`)
    return
  }

  effects.forEach((effect, index) => {
    const effectOwner = `${owner}.${property}[${index}]`

    if (!effect || typeof effect !== 'object') {
      errors.push(`${effectOwner} must be an object`)
      return
    }

    if (!effectTypes.has(effect.type)) {
      errors.push(`${effectOwner} has unknown effect type: ${effect.type}`)
      return
    }

    if (effect.type === 'flag') {
      if (!effect.flag) {
        errors.push(`${effectOwner} flag effect is missing flag`)
      } else {
        emittedFlags.add(effect.flag)
      }

      return
    }

    if (effect.type === 'clue') {
      if (!effect.clue) {
        errors.push(`${effectOwner} clue effect is missing clue`)
      } else {
        emittedClues.add(effect.clue)
      }

      return
    }

    if (effect.type === 'voice_bump') {
      if (!effect.voice) {
        errors.push(`${effectOwner} voice_bump effect is missing voice`)
      } else if (!voices.has(effect.voice)) {
        errors.push(`${effectOwner} references unknown voice: ${effect.voice}`)
      }

      if (effect.amount !== undefined && typeof effect.amount !== 'number') {
        errors.push(`${effectOwner} voice_bump amount must be numeric`)
      }

      return
    }

    if (effect.type === 'identity_posture' && !identityPostures.has(effect.posture)) {
      errors.push(`${effectOwner} identity_posture uses unknown posture: ${effect.posture}`)
    }
  })
}

function trackFlagReference(flag, owner, field) {
  if (!flag) {
    return
  }

  flagReferences.push({ flag, owner, field })
}

for (const [scriptId, script] of Object.entries(dialogues)) {
  if (script.id !== scriptId) {
    errors.push(`Script key/id mismatch: ${scriptId} vs ${script.id}`)
  }

  if (!script.nodes?.[script.start]) {
    errors.push(`${scriptId} start node is missing: ${script.start}`)
  }

  for (const [nodeId, node] of Object.entries(script.nodes ?? {})) {
    const owner = `${scriptId}.${nodeId}`

    if (node.id !== nodeId) {
      errors.push(`Node key/id mismatch: ${owner} vs ${node.id}`)
    }

    if (node.voice && !voices.has(node.voice)) {
      errors.push(`${owner} references unknown voice: ${node.voice}`)
    }

    if (node.parasite && !parasites.has(node.parasite)) {
      errors.push(`${owner} references unknown parasite: ${node.parasite}`)
    }

    trackEffects(node.effects, owner)

    const choices = node.choices ?? []
    const choiceIds = new Set()

    choices.forEach((choice, index) => {
      const choiceOwner = `${owner}.choices[${index}]`

      if (choice.id) {
        if (choiceIds.has(choice.id)) {
          errors.push(`${owner} has duplicate choice id: ${choice.id}`)
        }

        choiceIds.add(choice.id)
      }

      if (choice.next && !script.nodes[choice.next]) {
        errors.push(`${choiceOwner} points to missing node: ${choice.next}`)
      }

      trackFlagReference(choice.requiresFlag, choiceOwner, 'requiresFlag')
      trackFlagReference(choice.hiddenWhenFlag, choiceOwner, 'hiddenWhenFlag')

      if (!choice.next && !choice.close && !choice.check) {
        errors.push(`${choiceOwner} has no next, close, or check`)
      }

      trackEffects(choice.effects, choiceOwner)

      if (!choice.check) {
        return
      }

      const check = choice.check
      if (checkIds.has(check.id)) {
        errors.push(`Duplicate check id: ${check.id}`)
      }
      checkIds.set(check.id, choiceOwner)

      if (!voices.has(check.voice)) {
        errors.push(`${choiceOwner} check uses unknown voice: ${check.voice}`)
      }

      if (check.supportVoice && !voices.has(check.supportVoice)) {
        errors.push(`${choiceOwner} check uses unknown support voice: ${check.supportVoice}`)
      }

      if (!script.nodes[check.successNode]) {
        errors.push(`${choiceOwner} check success node is missing: ${check.successNode}`)
      }

      if (!script.nodes[check.failureNode]) {
        errors.push(`${choiceOwner} check failure node is missing: ${check.failureNode}`)
      }

      if (choice.hiddenWhenFlag && script.nodes[check.successNode] && script.nodes[check.failureNode]) {
        const successFlags = new Set(
          (script.nodes[check.successNode].effects ?? [])
            .filter((effect) => effect.type === 'flag')
            .map((effect) => effect.flag),
        )
        const failureFlags = new Set(
          (script.nodes[check.failureNode].effects ?? [])
            .filter((effect) => effect.type === 'flag')
            .map((effect) => effect.flag),
        )

        if (!successFlags.has(choice.hiddenWhenFlag) || !failureFlags.has(choice.hiddenWhenFlag)) {
          errors.push(
            `${choiceOwner} hides checked choice with ${choice.hiddenWhenFlag}, but both result nodes must set that flag`,
          )
        }
      }
    })
  }
}

for (const orb of orbs) {
  if (orbIds.has(orb.id)) {
    errors.push(`Duplicate orb id: ${orb.id}`)
  }
  orbIds.add(orb.id)

  if (orb.voice && !voices.has(orb.voice)) {
    errors.push(`${orb.id} references unknown voice: ${orb.voice}`)
  }

  trackEffects(orb.effects, orb.id)

  for (const variant of orb.variants ?? []) {
    const variantOwner = `${orb.id}.variant`

    trackFlagReference(variant.requiresFlag, variantOwner, 'requiresFlag')
    trackFlagReference(variant.hiddenWhenFlag, variantOwner, 'hiddenWhenFlag')

    if (variant.voice && !voices.has(variant.voice)) {
      errors.push(`${orb.id} variant references unknown voice: ${variant.voice}`)
    }

    trackEffects(variant.effects, variantOwner)
  }
}

for (const passive of passives) {
  if (passiveIds.has(passive.id)) {
    errors.push(`Duplicate passive id: ${passive.id}`)
  }
  passiveIds.add(passive.id)

  if (passive.voice && !voices.has(passive.voice)) {
    errors.push(`${passive.id} references unknown voice: ${passive.voice}`)
  }

  if (passive.parasite && !parasites.has(passive.parasite)) {
    errors.push(`${passive.id} references unknown parasite: ${passive.parasite}`)
  }

  if (passive.voice && passive.parasite) {
    errors.push(`${passive.id} cannot reference both a voice and a parasite`)
  }

  trackFlagReference(passive.requiresFlag, passive.id, 'requiresFlag')
  trackFlagReference(passive.hiddenWhenFlag, passive.id, 'hiddenWhenFlag')

  if (passive.channel !== passive.trigger?.type) {
    errors.push(`${passive.id} channel does not match trigger type: ${passive.channel} vs ${passive.trigger?.type}`)
  }

  if (passive.trigger?.type === 'dialogue') {
    const script = dialogues[passive.trigger.scriptId]

    if (!script) {
      errors.push(`${passive.id} references missing script: ${passive.trigger.scriptId}`)
    } else if (!script.nodes[passive.trigger.nodeId]) {
      errors.push(
        `${passive.id} references missing node: ${passive.trigger.scriptId}.${passive.trigger.nodeId}`,
      )
    }
  }

  if (passive.trigger?.type === 'clue' && !emittedClues.has(passive.trigger.clue)) {
    errors.push(`${passive.id} listens to a clue that is never emitted: ${passive.trigger.clue}`)
  }

  trackEffects(passive.optionalEffects, passive.id, 'optionalEffects')
}

for (const { flag, owner, field } of flagReferences) {
  if (!emittedFlags.has(flag)) {
    errors.push(`${owner} ${field} references a flag that is never emitted: ${flag}`)
  }
}

for (const clue of emittedClues) {
  const group = getClueGroup(clue)

  if (!group || group.id === 'other') {
    errors.push(`Clue is not covered by a specific clue group: ${clue}`)
  }
}

const summary = [
  `${Object.keys(dialogues).length} scripts`,
  `${Object.values(dialogues).reduce((count, script) => count + Object.keys(script.nodes).length, 0)} nodes`,
  `${orbs.length} orbs`,
  `${passives.length} passives`,
  `${checkIds.size} checks`,
]

if (errors.length) {
  console.error(errors.map((error) => `Error: ${error}`).join('\n'))
  process.exit(1)
}

console.log(`Content validation OK: ${summary.join(', ')}`)

function validateClueGroups() {
  const groupIds = new Set()
  let hasOtherGroup = false

  for (const group of clueGroups) {
    if (!group.id) {
      errors.push('Clue group is missing an id')
      continue
    }

    if (groupIds.has(group.id)) {
      errors.push(`Duplicate clue group id: ${group.id}`)
    }

    groupIds.add(group.id)

    if (group.id === 'other') {
      hasOtherGroup = true
      continue
    }

    if (!Array.isArray(group.keywords) || group.keywords.length === 0) {
      errors.push(`Clue group has no keywords: ${group.id}`)
    }
  }

  if (!hasOtherGroup) {
    errors.push('Missing required clue group: other')
  }
}

function getClueGroup(clue) {
  const normalizedClue = clue.toLocaleLowerCase('fr-FR')

  return clueGroups.reduce((bestGroup, candidate) => {
    if (candidate.id === 'other') {
      return bestGroup
    }

    const candidateScore = getClueGroupScore(normalizedClue, candidate.keywords)
    const bestScore = bestGroup ? getClueGroupScore(normalizedClue, bestGroup.keywords) : 0

    return candidateScore > bestScore ? candidate : bestGroup
  }, undefined)
}

function getClueGroupScore(clue, keywords = []) {
  return keywords.reduce((score, keyword) => {
    return clue.includes(keyword) ? score + 1 : score
  }, 0)
}
