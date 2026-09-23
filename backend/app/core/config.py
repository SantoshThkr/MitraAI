from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    cors_origin: str = "http://localhost:5173"
    session_cookie_name: str = "mitraai_session"
    session_ttl_days: int = 7
    cookie_secure: bool = False
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5:0.5b"
    chat_context_messages: int = 20
    ollama_embed_model: str = "nomic-embed-text"
    embedding_dimensions: int = 768
    upload_dir: str = "var/uploads"
    max_upload_bytes: int = 10 * 1024 * 1024
    chunk_chars: int = 1000
    chunk_overlap_chars: int = 150
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.6


settings = Settings()
