"""Configuration for automatic follow-up suggestions generation."""

from pydantic import BaseModel, Field


class SuggestionsConfig(BaseModel):
    """Configuration for automatic follow-up suggestions generation."""

    enabled: bool = Field(
        default=True,
        description="Whether to enable automatic follow-up suggestions generation",
    )
    model_name: str | None = Field(
        default=None,
        description="Model name to use for suggestions generation (None = use default model)",
    )
    max_suggestions: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum number of follow-up suggestions to generate",
    )


# Global configuration instance
_suggestions_config: SuggestionsConfig = SuggestionsConfig()


def get_suggestions_config() -> SuggestionsConfig:
    """Get the current suggestions configuration."""
    return _suggestions_config


def set_suggestions_config(config: SuggestionsConfig) -> None:
    """Set the suggestions configuration."""
    global _suggestions_config
    _suggestions_config = config


def load_suggestions_config_from_dict(config_dict: dict) -> None:
    """Load suggestions configuration from a dictionary."""
    global _suggestions_config
    _suggestions_config = SuggestionsConfig(**config_dict)
