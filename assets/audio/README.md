# assets/audio

Shared sound files used across every app in this repo.

## Files

| File            | Purpose                              |
| --------------- | ------------------------------------ |
| `chime.wav`     | Main completion sound (three bells)  |
| `click.wav`     | Short UI feedback click              |
| `phase-end.wav` | Softer tone for phase transitions    |

## Generating

The `.wav` files are generated, not committed by hand. Run:

```bash
cd assets/audio
node generate.js