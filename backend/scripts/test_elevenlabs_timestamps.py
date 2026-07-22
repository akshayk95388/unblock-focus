import asyncio
import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

async def test_elevenlabs_api():
    from elevenlabs.client import ElevenLabs
    from config.settings import get_settings

    api_key = get_settings().elevenlabs_api_key
    if not api_key:
        print("No ElevenLabs API key found!")
        return

    client = ElevenLabs(api_key=api_key)
    voice_id = "JBFqnCBsd6RMkjVDRZzb"  # George

    print("--- 1. Testing convert_with_timestamps ---")
    text = "Hello there. Let us take a deep breath."
    res = client.text_to_speech.convert_with_timestamps(
        voice_id=voice_id,
        text=text,
        model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
    )

    print("Response keys:", list(res.keys()))
    if "alignment" in res:
        alg = res["alignment"]
        print("\nAlignment keys:", list(alg.keys()) if isinstance(alg, dict) else dir(alg))
        chars = alg.get("characters", []) if isinstance(alg, dict) else getattr(alg, "characters", [])
        starts = alg.get("character_start_times_seconds", []) if isinstance(alg, dict) else getattr(alg, "character_start_times_seconds", [])
        ends = alg.get("character_end_times_seconds", []) if isinstance(alg, dict) else getattr(alg, "character_end_times_seconds", [])
        print(f"Total characters: {len(chars)}")
        print("First 10 characters:", chars[:10])
        print("First 10 start times (s):", starts[:10])
        print("First 10 end times (s):", ends[:10])
    elif "normalized_alignment" in res:
        print("\nNormalized alignment keys:", list(res["normalized_alignment"].keys()))

    print("\n--- 2. Testing previous_text / request stitching ---")
    import inspect
    convert_sig = inspect.signature(client.text_to_speech.convert)
    print("convert signature params:", list(convert_sig.parameters.keys()))
    
    # Try sending previous_text parameter
    try:
        res_stitch = client.text_to_speech.convert(
            voice_id=voice_id,
            text="And now we exhale gently.",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            previous_text="Hello there. Let us take a deep breath.",
        )
        print("previous_text request SUCCESSFUL!")
    except Exception as e:
        print("previous_text error:", e)

    try:
        res_req_id = client.text_to_speech.convert(
            voice_id=voice_id,
            text="And now we exhale gently.",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            previous_request_ids=["test_id"],
        )
        print("previous_request_ids request SUCCESSFUL!")
    except Exception as e:
        print("previous_request_ids error:", e)

if __name__ == "__main__":
    asyncio.run(test_elevenlabs_api())
