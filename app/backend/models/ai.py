"""AI endpoint request models."""

from typing import Literal

from pydantic import BaseModel, Field


class RoastAssistRequest(BaseModel):
    target_name: str = Field(min_length=1, max_length=60)
    theme: str = "genz"
    context: str = Field(default="", max_length=240)
    intensity: Literal["mild", "savage", "nuclear"] = "savage"
