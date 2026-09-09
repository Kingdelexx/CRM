from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, List

class OrganizationSchema(BaseModel):
    id: UUID
    name: str
    domain: Optional[str] = None
    logo: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    currency: str = 'USD'
    timezone: str = 'UTC'
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    other_info: Optional[str] = None
    gbp_to_ngn_rate: Optional[float] = 2000.0

    class Config:
        from_attributes = True

class RoleSchema(BaseModel):
    id: UUID
    name: str
    permissions: dict

    class Config:
        from_attributes = True

class DepartmentSchema(BaseModel):
    id: UUID
    name: str
    manager_id: Optional[UUID] = None

    class Config:
        from_attributes = True

class TeamSchema(BaseModel):
    id: UUID
    name: str
    department_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None

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
    custom_role: Optional[RoleSchema] = None
    department: Optional[DepartmentSchema] = None
    team: Optional[TeamSchema] = None
    manager_id: Optional[UUID] = None
    is_active: bool = True

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

class OrgUpdateSchema(BaseModel):
    name: str
    domain: Optional[str] = None
    logo: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    other_info: Optional[str] = None
    gbp_to_ngn_rate: Optional[float] = None

class UserCreateSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    first_name: str
    last_name: str
    role: str = 'SALES_REP'
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    custom_role_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None

class UserUpdateSchema(BaseModel):
    role: Optional[str] = None
    custom_role_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class DepartmentCreateSchema(BaseModel):
    name: str
    manager_id: Optional[UUID] = None

class TeamCreateSchema(BaseModel):
    name: str
    department_id: UUID
    manager_id: Optional[UUID] = None

class RoleCreateSchema(BaseModel):
    name: str
    permissions: dict
