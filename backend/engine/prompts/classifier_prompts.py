"""Classifier Prompt Templates & Category Definitions."""

from langchain_core.prompts import ChatPromptTemplate

CLASSIFY_PROMPT = """Classify this person's blocker into exactly one category and determine their intent.

What's blocking them: "{stressor}"

Categories:
- deadline: work deadline pressure, time crunch, too much to do, shipping pressure
- presentation: public speaking, pitch anxiety, meeting nerves, demo fear
- burnout: exhaustion, fatigue, no energy, been working too long, feeling depleted
- distraction: can't focus, phone addiction, social media, procrastination, scattered
- overthinking: racing mind, can't stop thinking, analysis paralysis, decision fatigue
- imposter: self-doubt, not good enough, comparing to others, feeling like a fraud
- exam: test anxiety, study pressure, academic stress, grades
- general: anything that doesn't clearly fit the categories above

Intent categories:
- work: the person wants to clear their block and get back to a task, project, or execution
- decompress: the person is emotionally overwhelmed, burnt out, or just needs relief with no specific work goal
"""

CLASSIFIER_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", "You are an expert mental reset classifier."),
    ("human", CLASSIFY_PROMPT),
])

VALID_TYPES = {
    "deadline",
    "presentation",
    "burnout",
    "distraction",
    "overthinking",
    "imposter",
    "exam",
    "general",
}

VALID_INTENTS = {
    "work",
    "decompress",
}
