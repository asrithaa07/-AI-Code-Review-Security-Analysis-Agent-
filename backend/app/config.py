from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./data/app.db"
    cors_origins: str = "http://localhost:3000"

    chroma_persist_dir: str = "./data/chroma"
    knowledge_base_dir: str = "./knowledge_base"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    gemini_api_key: str = ""
    llm_model: str = "gemini-2.0-flash"
    secret_key: str = "super-secret-key-for-development-spotlight-ai"
    access_token_expire_minutes: int = 10080  # 7 days in minutes

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def knowledge_base_path(self) -> Path:
        return Path(self.knowledge_base_dir).resolve()

    @property
    def chroma_path(self) -> Path:
        return Path(self.chroma_persist_dir).resolve()


settings = Settings()
