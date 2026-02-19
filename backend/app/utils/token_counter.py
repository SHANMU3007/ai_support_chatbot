"""
Token Counter – lightweight approximation using tiktoken (cl100k_base).
Falls back to char/4 approximation if tiktoken is unavailable.
"""
try:
    import tiktoken

    _enc = tiktoken.get_encoding("cl100k_base")

    def count_tokens(text: str) -> int:
        return len(_enc.encode(text))

except ImportError:
    def count_tokens(text: str) -> int:  # type: ignore[misc]
        return len(text) // 4
