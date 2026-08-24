from typing import List
from django.db import transaction
from django.contrib.auth import get_user_model
from ninja import Router
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth

from apps.accounts.models import Organization
from apps.accounts.schemas import SignUpInputSchema, UserSchema

router = Router()

@router.post("/signup", response={201: UserSchema})
def signup(request, data: SignUpInputSchema):
    User = get_user_model()
    from apps.crm.models import Stage
    
    # Check if user already exists
    if User.objects.filter(email=data.email).exists():
        raise HttpError(400, "A user with this email address already exists.")
        
    # Check if domain already exists, if provided
    if data.org_domain and Organization.objects.filter(domain=data.org_domain).exists():
        raise HttpError(400, "An organization with this domain already exists.")

    try:
        with transaction.atomic():
            # 1. Create Organization
            import secrets
            org = Organization.objects.create(
                name=data.org_name,
                domain=data.org_domain if data.org_domain else None,
                api_key=secrets.token_hex(24)
            )
            
            # 2. Seed Default Pipeline Stages
            stage_data = [
                ('Lead In', 1, 10),
                ('Contact Made', 2, 30),
                ('Demo Scheduled', 3, 50),
                ('Proposal Sent', 4, 70),
                ('Negotiation', 5, 90),
                ('Closed Won', 6, 100),
                ('Closed Lost', 7, 0),
            ]
            for name, order, prob in stage_data:
                Stage.objects.create(
                    organization=org,
                    name=name,
                    order=order,
                    win_probability=prob,
                    pipeline_type='SALES'
                )
            
            # 3. Create User
            user = User.objects.create_user(
                username=data.email,  # Using email as username
                email=data.email,
                password=data.password,
                first_name=data.first_name,
                last_name=data.last_name,
                role=User.ADMIN,
                organization=org,
                phone=data.phone if data.phone else None
            )
            return 201, user
    except Exception as e:
        raise HttpError(500, f"Error creating account: {str(e)}")

@router.get("/me", response=UserSchema, auth=JWTAuth())
def get_me(request):
    # JWTAuth populates request.user with the authenticated User object
    return request.user

@router.get("", response=List[UserSchema], auth=JWTAuth())
def list_users(request):
    User = get_user_model()
    return User.objects.filter(organization=request.user.organization)

