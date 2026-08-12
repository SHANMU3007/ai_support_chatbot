"""
Prompt Builder – constructs the system prompt for the AI engine.
"""

_LANG_NAMES: dict[str, str] = {
    "en": "English",
    "ta": "Tamil (தமிழ்)",
    "hi": "Hindi (हिन्दी)",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
    "it": "Italian",
}

SYSTEM_TEMPLATE = """\
You are a helpful AI customer-support assistant for {company_name}.
Your personality: {personality}
Your primary language: {language}

Use ONLY the information in the <context> section to answer questions.
If the answer is not in the context, politely say you don't have that information
and offer to connect the user with a human agent.

<context>
{context}
</context>

Additional instructions:
- Be concise but complete.
- Do not make up facts.
- If the user seems very frustrated, offer human escalation.
- Always stay in character as a support agent for {company_name}.
- Respond ONLY in {language}.
"""


def build_system_prompt(
    company_name: str,
    personality: str,
    language: str,
    context: str,
) -> str:
    lang_display = _LANG_NAMES.get(language, language)
    return SYSTEM_TEMPLATE.format(
        company_name=company_name or "the company",
        personality=personality or "friendly and professional",
        language=lang_display,
        context=context or "No context documents are available.",
    )
