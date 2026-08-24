from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional

class OrganizationSchema(BaseModel):
    id: UUID
    name: str
    domain: Optional[str] = None

    class Config:
        from_attributes = True

class UserSchema(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    phone: Optional[str] = None
    organization: Optional[OrganizationSchema] = None

    class Config:
        from_attributes = True

class SignUpInputSchema(BaseModel):
    org_name: str = Field(..., min_length=1)
    org_domain: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    phone: Optional[str] = None
