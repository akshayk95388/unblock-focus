"""Node 05 — Audio Composer: Thin wrapper that wires reconciler + composer."""
# This node is implemented directly in engine/audio/composer.py
# as audio_composer_node(). This file re-exports it for the pipeline.

from engine.audio.composer import audio_composer_node

__all__ = ["audio_composer_node"]
