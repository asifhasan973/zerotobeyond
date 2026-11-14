"""Reproduce the recorded voice repairs with the exact text/voice in the manifest."""

import asyncio
import json
import hashlib
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps/web/public"
MANIFEST = PUBLIC / "story/audio/voice-repairs.json"


async def main():
    manifest = json.loads(MANIFEST.read_text())
    semaphore = asyncio.Semaphore(3)

    async def generate(clip):
        async with semaphore:
            output = (PUBLIC / clip["url"].lstrip("/")).resolve()
            if not output.is_relative_to(PUBLIC.resolve()):
                raise ValueError("Output must remain in public assets")
            output.parent.mkdir(parents=True, exist_ok=True)
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(
                        clip["text"].strip(), clip["voice"]
                    ).save(str(output))
                    print(clip["id"], clip["gender"], flush=True)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2)

    await asyncio.gather(*(generate(clip) for clip in manifest["clips"]))
    for clip in manifest["clips"]:
        clip["sha256"] = hashlib.sha256(
            (PUBLIC / clip["url"].lstrip("/")).read_bytes()
        ).hexdigest()
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    asyncio.run(main())
