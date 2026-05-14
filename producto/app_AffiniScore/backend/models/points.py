from pydantic import BaseModel
from typing import Optional

class PointRequestCreate(BaseModel):
    sender_id: str
    receiver_id: str
    activity_name: str
    points_value: int
    description: Optional[str] = None