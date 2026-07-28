"""
AI-generated-text heuristic scorer -- v1 (no model download required).

This is a legitimate starting signal, not a placeholder: it implements the
same family of statistical cues the AegisAI report cites (burstiness,
perplexity-adjacent signals) from the DetectGPT / perplexity-burstiness
literature, without needing any model weights downloaded.

WHY IT EXISTS: this sandbox environment can't reach huggingface.co to
pull a real transformer classifier, so this heuristic is what's actually
tested and running end-to-end right now. It gives directionally correct,
explainable signal -- but it is a first pass, not a research-grade
detector, and should be read as complementary evidence rather than a
verdict, consistent with the report's "human stays in the loop" principle.

UPGRADE PATH (do this once you're running locally with internet access):
    pip install transformers torch
    from transformers import pipeline
    _classifier = pipeline("text-classification", model="openai-community/roberta-base-openai-detector")
    # then blend _classifier(text)[0]["score"] with the heuristic below,
    # or replace it outright once you've validated it against real samples.
"""
import re
import statistics

# Phrases that show up disproportionately often in LLM-generated academic
# writing. Not proof on their own -- used as one signal among several.
AI_MARKER_PHRASES = [
    "furthermore", "moreover", "additionally", "in conclusion",
    "it is important to note", "overall,", "in summary",
    "on the other hand", "it is worth noting", "in essence",
    "delve into", "underscores the", "plays a crucial role",
    "it is essential to", "a testament to",
]


def _sentences(text: str) -> list[str]:
    # Simple splitter -- good enough for scoring, not meant to be a full
    # sentence tokenizer.
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if p]


def _burstiness_score(text: str) -> float:
    """
    0-1, higher = more AI-like. Human writing tends to vary sentence
    length more (mix of short punchy sentences and long complex ones);
    AI text tends toward more uniform sentence lengths.
    """
    sents = _sentences(text)
    if len(sents) < 3:
        return 0.5  # not enough signal either way

    lengths = [len(s.split()) for s in sents]
    mean_len = statistics.mean(lengths)
    if mean_len == 0:
        return 0.5

    stdev = statistics.pstdev(lengths)
    coefficient_of_variation = stdev / mean_len

    # Lower variation -> more uniform -> more AI-like.
    # CoV around 0.3-0.6 is typical human writing; below ~0.2 reads as
    # unusually uniform.
    if coefficient_of_variation >= 0.5:
        return 0.2
    if coefficient_of_variation <= 0.15:
        return 0.85
    # Linear interpolation between those anchors.
    return 0.85 - (coefficient_of_variation - 0.15) / (0.5 - 0.15) * (0.85 - 0.2)


def _marker_phrase_score(text: str) -> float:
    """0-1, higher = more AI-like, based on stock-phrase density."""
    lowered = text.lower()
    hits = sum(1 for phrase in AI_MARKER_PHRASES if phrase in lowered)
    word_count = max(1, len(text.split()))
    density = hits / (word_count / 100)  # hits per 100 words
    return min(1.0, density / 2.5)  # 2.5 hits/100 words treated as very high


def _lexical_uniformity_score(text: str) -> float:
    """
    0-1, higher = more AI-like. Very high type-token ratio (every word
    distinct) can indicate synonym-heavy, over-varied AI phrasing;
    extremely low can indicate repetitive filler. We penalize both tails
    lightly and treat the middle as neutral-human.
    """
    words = re.findall(r"[a-zA-Z']+", text.lower())
    if len(words) < 15:
        return 0.5
    ttr = len(set(words)) / len(words)
    # Typical human short-form writing: ttr ~0.55-0.75
    if 0.5 <= ttr <= 0.8:
        return 0.35
    return 0.55


def score_text(text: str) -> float:
    """
    Returns a 0-1 probability-style score. Weighted blend of the three
    heuristics above -- weights are a starting point, tune once you have
    real labeled samples to validate against.
    """
    if not text or len(text.split()) < 8:
        return 0.5  # too short to say anything meaningful

    burst = _burstiness_score(text)
    markers = _marker_phrase_score(text)
    lexical = _lexical_uniformity_score(text)

    score = 0.5 * burst + 0.35 * markers + 0.15 * lexical
    return round(min(0.97, max(0.03, score)), 3)
