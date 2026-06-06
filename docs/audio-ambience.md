# Ambiance audio - Parking P2

## Asset runtime

- `public/assets/audio/p2-ambience-loop.ogg`
- `public/assets/audio/p2-ambience-loop.mp3`

La version OGG est prioritaire pour le navigateur. Le MP3 sert de fallback.

## Generation

- Tool: ACE-Step 1.5 local
- Repository: `https://github.com/ACE-Step/ACE-Step-1.5`
- Model: `acestep-v15-turbo`
- Seed selected: `9281`
- Source duration: `72s`
- Runtime loop duration: `67s`
- Processing: last `5s` crossfaded into first `5s`, then middle segment concatenated for a circular loop.
- Output level: about `-20.3 dB` mean volume, peak `-2.5 dB`.

Prompt:

```text
minimal instrumental social thriller ambience, bureaucratic crime scene in a cold parking garage, utility van with open trunk, fluorescent hum, concrete room tone, restrained bass, low bowed metal, sparse piano notes, anxious but quiet, 62 bpm, no vocals, no epic cinema, no big drums, subtle professional noir score for narrative game
```

## Notes

ACE-Step 1.5 is MIT-licensed, but the project should still avoid prompting for protected artists, exact song references, or recognisable copyrighted material. This track was generated from scene direction only.
