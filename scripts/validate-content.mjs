import fs from 'node:fs'

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))

const dialogues = readJson('src/content/dialogues.json')
const voiceDefinitions = readJson('src/content/voices.json')
const parasiteDefinitions = readJson('src/content/parasites.json')
const voices = new Set(voiceDefinitions.map((voice) => voice.id))
const parasites = new Set(parasiteDefinitions.map((parasite) => parasite.id))
const clueGroups = readJson('src/game/clue-groups.json')
const orbs = readJson('src/content/locations/miroirs/orbs.json')
const passiveFiles = fs
  .readdirSync('src/content/locations/miroirs')
  .filter((fileName) => fileName.endsWith('.passives.json'))
  .sort()
const passives = passiveFiles.flatMap((fileName) => readJson(`src/content/locations/miroirs/${fileName}`))

const errors = []
const warnings = []
const emittedClues = new Set()
const emittedFlags = new Set()
const flagReferences = []
const runtimeFlagReferences = collectRuntimeFlagReferences('src')
const checkIds = new Map()
const orbIds = new Set()
const passiveIds = new Set()
const effectTypes = new Set(['flag', 'clue', 'voice_bump', 'identity_posture'])
const identityPostures = new Set(['accept', 'refuse', 'perform', 'defile'])
const colorPattern = /^#[0-9a-fA-F]{6}$/
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
validateChannels(voiceDefinitions, 'voice')
validateChannels(parasiteDefinitions, 'parasite')

function trackEffects(effects, owner, property = 'effects') {
  if (effects === undefined) {
    return
  }

  if (!Array.isArray(effects)) {
    errors.push(`${owner} ${property} must be an array`)
    return
  }

  effects.forEach((effect, index) => {
    const effectOwner = `${owner}.${property}[${index}]`

    if (!isRecord(effect)) {
      errors.push(`${effectOwner} must be an object`)
      return
    }

    if (!effectTypes.has(effect.type)) {
      errors.push(`${effectOwner} has unknown effect type: ${effect.type}`)
      return
    }

    if (effect.type === 'flag') {
      if (!isNonEmptyString(effect.flag)) {
        errors.push(`${effectOwner} flag effect is missing flag`)
      } else {
        emittedFlags.add(effect.flag)
      }

      return
    }

    if (effect.type === 'clue') {
      if (!isNonEmptyString(effect.clue)) {
        errors.push(`${effectOwner} clue effect is missing clue`)
      } else {
        emittedClues.add(effect.clue)
      }

      return
    }

    if (effect.type === 'voice_bump') {
      if (!isNonEmptyString(effect.voice)) {
        errors.push(`${effectOwner} voice_bump effect is missing voice`)
      } else if (!voices.has(effect.voice)) {
        errors.push(`${effectOwner} references unknown voice: ${effect.voice}`)
      }

      if (effect.amount !== undefined && !isFiniteNumber(effect.amount)) {
        errors.push(`${effectOwner} voice_bump amount must be a finite number`)
      }

      return
    }

    if (effect.type === 'identity_posture' && !identityPostures.has(effect.posture)) {
      errors.push(`${effectOwner} identity_posture uses unknown posture: ${effect.posture}`)
    }
  })
}

function trackFlagReference(flag, owner, field) {
  if (flag === undefined) {
    return
  }

  if (!isNonEmptyString(flag)) {
    errors.push(`${owner} ${field} must be a non-empty string`)
    return
  }

  flagReferences.push({ flag, owner, field })
}

if (!isRecord(dialogues)) {
  errors.push('Dialogues root must be an object keyed by script id')
}

for (const [scriptId, script] of Object.entries(isRecord(dialogues) ? dialogues : {})) {
  if (!isRecord(script)) {
    errors.push(`${scriptId} script must be an object`)
    continue
  }

  validateRequiredString(script.id, `${scriptId}.id`)
  validateRequiredString(script.title, `${scriptId}.title`)
  validateRequiredString(script.start, `${scriptId}.start`)

  if (isNonEmptyString(script.id) && script.id !== scriptId) {
    errors.push(`Script key/id mismatch: ${scriptId} vs ${script.id}`)
  }

  if (!isRecord(script.nodes)) {
    errors.push(`${scriptId}.nodes must be an object keyed by node id`)
    continue
  }

  const nodes = script.nodes

  if (isNonEmptyString(script.start) && !Object.hasOwn(nodes, script.start)) {
    errors.push(`${scriptId} start node is missing: ${script.start}`)
  }

  for (const [nodeId, node] of Object.entries(nodes)) {
    const owner = `${scriptId}.${nodeId}`

    if (!isRecord(node)) {
      errors.push(`${owner} must be an object`)
      continue
    }

    validateRequiredString(node.id, `${owner}.id`)
    validateRequiredString(node.speaker, `${owner}.speaker`)
    validateRequiredString(node.text, `${owner}.text`)

    if (isNonEmptyString(node.id) && node.id !== nodeId) {
      errors.push(`Node key/id mismatch: ${owner} vs ${node.id}`)
    }

    if (node.voice !== undefined) {
      if (!isNonEmptyString(node.voice)) {
        errors.push(`${owner}.voice must be a non-empty string`)
      } else if (!voices.has(node.voice)) {
        errors.push(`${owner} references unknown voice: ${node.voice}`)
      }
    }

    if (node.parasite !== undefined) {
      if (!isNonEmptyString(node.parasite)) {
        errors.push(`${owner}.parasite must be a non-empty string`)
      } else if (!parasites.has(node.parasite)) {
        errors.push(`${owner} references unknown parasite: ${node.parasite}`)
      }
    }

    if (node.parasite === 'dose' && !hasFlagEffect(node.effects, 'dose_heard')) {
      errors.push(`${owner} uses La Dose without setting dose_heard`)
    }

    trackEffects(node.effects, owner)

    if (!Array.isArray(node.choices)) {
      errors.push(`${owner}.choices must be an array`)
      continue
    }

    const choices = node.choices
    const choiceIds = new Set()

    choices.forEach((choice, index) => {
      const choiceOwner = `${owner}.choices[${index}]`

      if (!isRecord(choice)) {
        errors.push(`${choiceOwner} must be an object`)
        return
      }

      validateRequiredString(choice.label, `${choiceOwner}.label`)

      if (choice.id !== undefined) {
        if (!isNonEmptyString(choice.id)) {
          errors.push(`${choiceOwner}.id must be a non-empty string`)
        } else if (choiceIds.has(choice.id)) {
          errors.push(`${owner} has duplicate choice id: ${choice.id}`)
        } else {
          choiceIds.add(choice.id)
        }
      }

      if (choice.next !== undefined) {
        if (!isNonEmptyString(choice.next)) {
          errors.push(`${choiceOwner}.next must be a non-empty string`)
        } else if (!Object.hasOwn(nodes, choice.next)) {
          errors.push(`${choiceOwner} points to missing node: ${choice.next}`)
        }
      }

      if (choice.close !== undefined && typeof choice.close !== 'boolean') {
        errors.push(`${choiceOwner}.close must be a boolean`)
      }

      if (choice.important !== undefined && typeof choice.important !== 'boolean') {
        errors.push(`${choiceOwner}.important must be a boolean`)
      }

      trackFlagReference(choice.requiresFlag, choiceOwner, 'requiresFlag')
      trackFlagReference(choice.hiddenWhenFlag, choiceOwner, 'hiddenWhenFlag')

      if (!hasChoiceExit(choice)) {
        errors.push(`${choiceOwner} has no next, close, or check`)
      }

      trackEffects(choice.effects, choiceOwner)
      validateIdentityChoice(choice, choiceOwner)

      if (choice.check === undefined) {
        return
      }

      if (!isRecord(choice.check)) {
        errors.push(`${choiceOwner}.check must be an object`)
        return
      }

      const check = choice.check
      validateRequiredString(check.id, `${choiceOwner}.check.id`)
      validateRequiredString(check.voice, `${choiceOwner}.check.voice`)
      validateRequiredString(check.successNode, `${choiceOwner}.check.successNode`)
      validateRequiredString(check.failureNode, `${choiceOwner}.check.failureNode`)

      if (isNonEmptyString(check.id)) {
        if (checkIds.has(check.id)) {
          errors.push(`Duplicate check id: ${check.id}`)
        }
        checkIds.set(check.id, choiceOwner)
      }

      if (isNonEmptyString(check.voice) && !voices.has(check.voice)) {
        errors.push(`${choiceOwner} check uses unknown voice: ${check.voice}`)
      }

      if (check.supportVoice !== undefined) {
        if (!isNonEmptyString(check.supportVoice)) {
          errors.push(`${choiceOwner}.check.supportVoice must be a non-empty string`)
        } else if (!voices.has(check.supportVoice)) {
          errors.push(`${choiceOwner} check uses unknown support voice: ${check.supportVoice}`)
        }
      }

      if (!isFiniteNumber(check.difficulty)) {
        errors.push(`${choiceOwner}.check.difficulty must be a finite number`)
      }

      if (isNonEmptyString(check.successNode) && !Object.hasOwn(nodes, check.successNode)) {
        errors.push(`${choiceOwner} check success node is missing: ${check.successNode}`)
      }

      if (isNonEmptyString(check.failureNode) && !Object.hasOwn(nodes, check.failureNode)) {
        errors.push(`${choiceOwner} check failure node is missing: ${check.failureNode}`)
      }

      if (
        isNonEmptyString(choice.hiddenWhenFlag) &&
        isNonEmptyString(check.successNode) &&
        isNonEmptyString(check.failureNode) &&
        Object.hasOwn(nodes, check.successNode) &&
        Object.hasOwn(nodes, check.failureNode)
      ) {
        const successFlags = getNodeFlagEffects(nodes[check.successNode])
        const failureFlags = getNodeFlagEffects(nodes[check.failureNode])

        if (!successFlags.has(choice.hiddenWhenFlag) || !failureFlags.has(choice.hiddenWhenFlag)) {
          errors.push(
            `${choiceOwner} hides checked choice with ${choice.hiddenWhenFlag}, but both result nodes must set that flag`,
          )
        }
      }
    })
  }

  validateScriptReachability(scriptId, script, nodes)
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

for (const flag of runtimeFlagReferences) {
  if (!emittedFlags.has(flag)) {
    errors.push(`Runtime statically reads a flag that is never emitted: ${flag}`)
  }
}

const referencedFlags = new Set(flagReferences.map((reference) => reference.flag))
const unreadEmittedFlags = [...emittedFlags]
  .filter((flag) => !referencedFlags.has(flag) && !runtimeFlagReferences.has(flag))
  .sort((left, right) => left.localeCompare(right))

if (unreadEmittedFlags.length > 0) {
  warnings.push(
    `Flags emitted but never read by content gates or static runtime reads: ${unreadEmittedFlags.join(', ')}`,
  )
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

if (warnings.length) {
  console.warn(warnings.map((warning) => `Warning: ${warning}`).join('\n'))
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

function validateChannels(channels, kind) {
  if (!Array.isArray(channels)) {
    errors.push(`${kind} definitions must be an array`)
    return
  }

  for (const [index, channel] of channels.entries()) {
    const owner = `${kind} ${isRecord(channel) ? (channel.id ?? index) : index}`

    if (!isRecord(channel)) {
      errors.push(`${owner} must be an object`)
      continue
    }

    if (!isNonEmptyString(channel.id)) {
      errors.push(`${kind} is missing an id`)
    }

    if (!isNonEmptyString(channel.name)) {
      errors.push(`${kind} ${channel.id ?? '<unknown>'} is missing a name`)
    }

    if (!colorPattern.test(channel.color ?? '')) {
      errors.push(`${kind} ${channel.id ?? '<unknown>'} has invalid color: ${channel.color}`)
    }
  }
}

function validateIdentityChoice(choice, owner) {
  const hasIdentityPosture = Array.isArray(choice.effects)
    ? choice.effects.some((effect) => isRecord(effect) && effect.type === 'identity_posture')
    : false

  if (!hasIdentityPosture) {
    return
  }

  if (choice.hiddenWhenFlag !== 'identity_chosen') {
    errors.push(`${owner} identity posture choice must be hidden after identity_chosen`)
  }

  if (!hasFlagEffect(choice.effects, 'identity_chosen')) {
    errors.push(`${owner} identity posture choice must set identity_chosen`)
  }
}

function validateScriptReachability(scriptId, script, nodes) {
  if (!isNonEmptyString(script.start) || !Object.hasOwn(nodes, script.start)) {
    return
  }

  const reachable = new Set([script.start])
  const queue = [script.start]

  while (queue.length > 0) {
    const nodeId = queue.shift()
    const node = nodes[nodeId]

    if (!isRecord(node) || !Array.isArray(node.choices)) {
      continue
    }

    node.choices.forEach((choice, index) => {
      if (!isRecord(choice)) {
        return
      }

      for (const target of getChoiceTargets(choice)) {
        if (!isNonEmptyString(target)) {
          continue
        }

        if (!Object.hasOwn(nodes, target)) {
          errors.push(`${scriptId}.${nodeId}.choices[${index}] reaches missing node: ${target}`)
          continue
        }

        if (!reachable.has(target)) {
          reachable.add(target)
          queue.push(target)
        }
      }
    })
  }

  const unreachableNodes = Object.keys(nodes).filter((nodeId) => !reachable.has(nodeId)).sort()

  if (unreachableNodes.length > 0) {
    errors.push(`${scriptId} has unreachable nodes from start "${script.start}": ${unreachableNodes.join(', ')}`)
  }
}

function getChoiceTargets(choice) {
  if (isRecord(choice.check)) {
    return [choice.check.successNode, choice.check.failureNode]
  }

  return [choice.next]
}

function hasChoiceExit(choice) {
  return isNonEmptyString(choice.next) || choice.close === true || isRecord(choice.check)
}

function hasFlagEffect(effects, flag) {
  return Array.isArray(effects) && effects.some((effect) => isRecord(effect) && effect.type === 'flag' && effect.flag === flag)
}

function getNodeFlagEffects(node) {
  if (!isRecord(node) || !Array.isArray(node.effects)) {
    return new Set()
  }

  return new Set(
    node.effects
      .filter((effect) => isRecord(effect) && effect.type === 'flag' && isNonEmptyString(effect.flag))
      .map((effect) => effect.flag),
  )
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
  if (!Array.isArray(keywords)) {
    return 0
  }

  return keywords.reduce((score, keyword) => {
    return clue.includes(keyword) ? score + 1 : score
  }, 0)
}

function validateRequiredString(value, owner) {
  if (!isNonEmptyString(value)) {
    errors.push(`${owner} must be a non-empty string`)
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function collectRuntimeFlagReferences(rootDirectory) {
  const references = new Set()

  if (!fs.existsSync(rootDirectory)) {
    return references
  }

  for (const filePath of listSourceFiles(rootDirectory)) {
    const source = fs.readFileSync(filePath, 'utf8')

    for (const match of source.matchAll(/\bflags\.([A-Za-z_$][\w$]*)/g)) {
      references.add(match[1])
    }

    for (const match of source.matchAll(/\bflags\[['"]([^'"]+)['"]\]/g)) {
      references.add(match[1])
    }
  }

  return references
}

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = `${directory}/${entry.name}`

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath)
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : []
  })
}
