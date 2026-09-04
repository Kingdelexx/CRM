from typing import List, Optional
from uuid import UUID
from django.db import transaction
from django.contrib.auth import get_user_model
from ninja import Router
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Q

from apps.accounts.models import Organization, Role, Department, Team
from apps.accounts.schemas import (
    SignUpInputSchema, UserSchema, OrgUpdateSchema, UserUpdateSchema, UserCreateSchema,
    DepartmentSchema, DepartmentCreateSchema, TeamSchema, TeamCreateSchema,
    RoleSchema, RoleCreateSchema
)

router = Router()

@router.post("/signup", response={201: UserSchema})
def signup(request, data: SignUpInputSchema):
    User = get_user_model()
    from apps.crm.models import Stage
    
    if User.objects.filter(email=data.email).exists():
        raise HttpError(400, "A user with this email address already exists.")
        
    if data.org_domain and Organization.objects.filter(domain=data.org_domain).exists():
        raise HttpError(400, "An organization with this domain already exists.")

    try:
        with transaction.atomic():
            import secrets
            org = Organization.objects.create(
                name=data.org_name,
                domain=data.org_domain if data.org_domain else None,
                api_key=secrets.token_hex(24)
            )
            
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
            
            user = User.objects.create_user(
                username=data.email,
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
    return request.user

@router.get("", response=List[UserSchema], auth=JWTAuth())
def list_users(request):
    User = get_user_model()
    return User.objects.filter(organization=request.user.organization).select_related('custom_role', 'department', 'team')

# -- Organization Updates --
@router.put("/organization", response=UserSchema, auth=JWTAuth())
def update_organization(request, data: OrgUpdateSchema):
    if request.user.role != 'ADMIN':
        raise HttpError(403, "Only admins can change organization settings.")
    org = request.user.organization
    if not org:
        raise HttpError(404, "Organization not configured.")
        
    for k, v in data.dict(exclude_unset=True).items():
        setattr(org, k, v)
    org.save()
    return request.user

# -- User / Member Administration --
@router.post("/users", response={201: UserSchema}, auth=JWTAuth())
def invite_user(request, data: UserCreateSchema):
    if request.user.role != 'ADMIN':
        raise HttpError(403, "Only admins can add employees.")
        
    User = get_user_model()
    if User.objects.filter(email=data.email).exists():
        raise HttpError(400, "A user with this email address already exists.")
        
    dept = Department.objects.filter(id=data.department_id, organization=request.user.organization).first() if data.department_id else None
    team = Team.objects.filter(id=data.team_id, organization=request.user.organization).first() if data.team_id else None
    custom_role = Role.objects.filter(id=data.custom_role_id, organization=request.user.organization).first() if data.custom_role_id else None
    manager = User.objects.filter(id=data.manager_id, organization=request.user.organization).first() if data.manager_id else None

    user = User.objects.create_user(
        username=data.email,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
        organization=request.user.organization,
        phone=data.phone,
        department=dept,
        team=team,
        custom_role=custom_role,
        manager=manager,
        is_active=True
    )
    return 201, user

@router.put("/users/{user_id}", response=UserSchema, auth=JWTAuth())
def update_user(request, user_id: UUID, data: UserUpdateSchema):
    if request.user.role != 'ADMIN':
        raise HttpError(403, "Only admins can edit user configurations.")
        
    User = get_user_model()
    user = User.objects.filter(id=user_id, organization=request.user.organization).first()
    if not user:
        raise HttpError(404, "User not found within your organization.")
        
    payload = data.dict(exclude_unset=True)
    if 'role' in payload:
        user.role = payload['role']
    if 'is_active' in payload:
        user.is_active = payload['is_active']
    if 'password' in payload and payload['password']:
        user.set_password(payload['password'])
        
    if 'custom_role_id' in payload:
        role_id = payload['custom_role_id']
        user.custom_role = Role.objects.filter(id=role_id, organization=request.user.organization).first() if role_id else None
        
    if 'department_id' in payload:
        dept_id = payload['department_id']
        user.department = Department.objects.filter(id=dept_id, organization=request.user.organization).first() if dept_id else None
        
    if 'team_id' in payload:
        team_id = payload['team_id']
        user.team = Team.objects.filter(id=team_id, organization=request.user.organization).first() if team_id else None
        
    if 'manager_id' in payload:
        mgr_id = payload['manager_id']
        user.manager = User.objects.filter(id=mgr_id, organization=request.user.organization).first() if mgr_id else None
        
    user.save()
    return user

# -- Department CRUD --
@router.get("/departments", response=List[DepartmentSchema], auth=JWTAuth())
def list_departments(request):
    return Department.objects.filter(organization=request.user.organization)

@router.post("/departments", response={201: DepartmentSchema}, auth=JWTAuth())
def create_department(request, data: DepartmentCreateSchema):
    User = get_user_model()
    manager = None
    if data.manager_id:
        manager = User.objects.filter(id=data.manager_id, organization=request.user.organization).first()
    dept = Department.objects.create(
        organization=request.user.organization,
        name=data.name,
        manager=manager
    )
    return 201, dept

@router.put("/departments/{id}", response=DepartmentSchema, auth=JWTAuth())
def update_department(request, id: UUID, data: DepartmentCreateSchema):
    dept = Department.objects.filter(id=id, organization=request.user.organization).first()
    if not dept:
        raise HttpError(404, "Department not found.")
    User = get_user_model()
    if data.manager_id:
        dept.manager = User.objects.filter(id=data.manager_id, organization=request.user.organization).first()
    else:
        dept.manager = None
    dept.name = data.name
    dept.save()
    return dept

@router.delete("/departments/{id}", response={204: None}, auth=JWTAuth())
def delete_department(request, id: UUID):
    dept = Department.objects.filter(id=id, organization=request.user.organization).first()
    if not dept:
        raise HttpError(404, "Department not found.")
    dept.delete()
    return 204, None

# -- Team CRUD --
@router.get("/teams", response=List[TeamSchema], auth=JWTAuth())
def list_teams(request):
    return Team.objects.filter(organization=request.user.organization)

@router.post("/teams", response={201: TeamSchema}, auth=JWTAuth())
def create_team(request, data: TeamCreateSchema):
    dept = Department.objects.filter(id=data.department_id, organization=request.user.organization).first()
    if not dept:
        raise HttpError(400, "Invalid department ID.")
    User = get_user_model()
    manager = None
    if data.manager_id:
        manager = User.objects.filter(id=data.manager_id, organization=request.user.organization).first()
    team = Team.objects.create(
        organization=request.user.organization,
        department=dept,
        name=data.name,
        manager=manager
    )
    return 201, team

@router.put("/teams/{id}", response=TeamSchema, auth=JWTAuth())
def update_team(request, id: UUID, data: TeamCreateSchema):
    team = Team.objects.filter(id=id, organization=request.user.organization).first()
    if not team:
        raise HttpError(404, "Team not found.")
    dept = Department.objects.filter(id=data.department_id, organization=request.user.organization).first()
    if not dept:
         raise HttpError(400, "Invalid department ID.")
    User = get_user_model()
    if data.manager_id:
        team.manager = User.objects.filter(id=data.manager_id, organization=request.user.organization).first()
    else:
        team.manager = None
    team.department = dept
    team.name = data.name
    team.save()
    return team

@router.delete("/teams/{id}", response={204: None}, auth=JWTAuth())
def delete_team(request, id: UUID):
    team = Team.objects.filter(id=id, organization=request.user.organization).first()
    if not team:
        raise HttpError(404, "Team not found.")
    team.delete()
    return 204, None

# -- Custom Roles CRUD --
@router.get("/roles", response=List[RoleSchema], auth=JWTAuth())
def list_roles(request):
    return Role.objects.filter(organization=request.user.organization)

@router.post("/roles", response={201: RoleSchema}, auth=JWTAuth())
def create_role(request, data: RoleCreateSchema):
    role = Role.objects.create(
        organization=request.user.organization,
        name=data.name,
        permissions=data.permissions
    )
    return 201, role

@router.put("/roles/{id}", response=RoleSchema, auth=JWTAuth())
def update_role(request, id: UUID, data: RoleCreateSchema):
    role = Role.objects.filter(id=id, organization=request.user.organization).first()
    if not role:
        raise HttpError(404, "Role not found.")
    role.name = data.name
    role.permissions = data.permissions
    role.save()
    return role

@router.delete("/roles/{id}", response={204: None}, auth=JWTAuth())
def delete_role(request, id: UUID):
    role = Role.objects.filter(id=id, organization=request.user.organization).first()
    if not role:
        raise HttpError(404, "Role not found.")
    role.delete()
    return 204, None

# -- COMPREHENSIVE DASHBOARD METRICS ENGINE --
@router.get("/dashboard-metrics", auth=JWTAuth())
def get_dashboard_metrics(request):
    user = request.user
    org = user.organization
    from apps.crm.models import Deal, Contact, Project
    from apps.planning.models import Task, Activity
    
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Determine dashboard mode
    # Standard Admin user or Boss role -> BOSS Dashboard
    # Manager role -> MANAGER Dashboard
    # Sales Rep or other -> EMPLOYEE Dashboard
    
    mode = 'EMPLOYEE'
    if user.role == 'ADMIN':
        mode = 'BOSS'
    elif user.role == 'MANAGER':
        mode = 'MANAGER'
        
    activity_limit = 15

    if mode == 'BOSS':
        # BOSS mode: view aggregate metrics across all units
        total_revenue = Deal.objects.filter(organization=org, status='WON').aggregate(val=Sum('value'))['val'] or 0.0
        pipeline_value = Deal.objects.filter(organization=org, status='OPEN').aggregate(val=Sum('value'))['val'] or 0.0
        active_deals = Deal.objects.filter(organization=org, status='OPEN').count()
        won_deals = Deal.objects.filter(organization=org, status='WON').count()
        lost_deals = Deal.objects.filter(organization=org, status='LOST').count()
        total_deals = won_deals + lost_deals
        win_rate = (won_deals / total_deals * 100) if total_deals > 0 else 0.0
        
        # Tasks aggregate
        tasks_todo = Task.objects.filter(organization=org, status='TODO').count()
        tasks_progress = Task.objects.filter(organization=org, status='IN_PROGRESS').count()
        tasks_completed = Task.objects.filter(organization=org, status='DONE').count()
        tasks_overdue = Task.objects.filter(organization=org, due_date__lt=now).exclude(status='DONE').count()
        
        # Organization Units / Departments performance
        departments_data = []
        depts = Department.objects.filter(organization=org)
        for d in depts:
            dept_reps = d.users.all()
            dept_deals = Deal.objects.filter(organization=org, contact__assigned_to__in=dept_reps)
            dept_revenue = dept_deals.filter(status='WON').aggregate(v=Sum('value'))['v'] or 0.0
            dept_pipeline = dept_deals.filter(status='OPEN').aggregate(v=Sum('value'))['v'] or 0.0
            dept_won_count = dept_deals.filter(status='WON').count()
            departments_data.append({
                "id": str(d.id),
                "name": d.name,
                "revenue": dept_revenue,
                "pipeline": dept_pipeline,
                "deals_won": dept_won_count,
                "members_count": dept_reps.count()
            })
            
        # Projects status
        projects = Project.objects.filter(organization=org)
        project_stats = {
            "total": projects.count(),
            "planning": projects.filter(status='PLANNING').count(),
            "in_progress": projects.filter(status='IN_PROGRESS').count(),
            "ready": projects.filter(status='READY').count(),
            "delivered": projects.filter(status='DELIVERED').count()
        }
        
        # Activity stream
        activities = Activity.objects.filter(organization=org).select_related('performed_by').order_by('-activity_date')[:activity_limit]
        activities_list = [{
            "id": str(act.id),
            "type": act.type,
            "content": act.content,
            "performed_by": f"{act.performed_by.first_name} {act.performed_by.last_name}" if act.performed_by else "System",
            "time": act.activity_date.isoformat()
        } for act in activities]

        return {
            "mode": "BOSS",
            "stats": {
                "total_revenue": total_revenue,
                "pipeline_value": pipeline_value,
                "active_deals": active_deals,
                "win_rate": round(win_rate, 1)
            },
            "tasks": {
                "todo": tasks_todo,
                "in_progress": tasks_progress,
                "completed": tasks_completed,
                "overdue": tasks_overdue
            },
            "departments": departments_data,
            "projects": project_stats,
            "activities": activities_list
        }

    elif mode == 'MANAGER':
        # MANAGER mode: view team members, team tasks, completed/pending/overdue, team performance
        # A manager manages a Department or a Team. Let's find all users who have this user as manager, or are in the department/team managed by this user.
        managed_depts = Department.objects.filter(organization=org, manager=user)
        managed_teams = Team.objects.filter(organization=org, manager=user)
        
        team_members_qs = get_user_model().objects.filter(
            Q(organization=org) & (
                Q(manager=user) | 
                Q(department__in=managed_depts) | 
                Q(team__in=managed_teams)
            )
        ).distinct()
        
        # Include self in the list of team members for query, or keep distinct
        member_ids = list(team_members_qs.values_list('id', flat=True))
        if user.id not in member_ids:
            member_ids.append(user.id)
            
        team_deals = Deal.objects.filter(organization=org, contact__assigned_to_id__in=member_ids)
        total_revenue = team_deals.filter(status='WON').aggregate(val=Sum('value'))['val'] or 0.0
        pipeline_value = team_deals.filter(status='OPEN').aggregate(val=Sum('value'))['val'] or 0.0
        active_deals = team_deals.filter(status='OPEN').count()
        won_deals = team_deals.filter(status='WON').count()
        lost_deals = team_deals.filter(status='LOST').count()
        total_deals = won_deals + lost_deals
        win_rate = (won_deals / total_deals * 100) if total_deals > 0 else 0.0
        
        # Team Tasks
        team_tasks = Task.objects.filter(organization=org, assignee_id__in=member_ids)
        tasks_todo = team_tasks.filter(status='TODO').count()
        tasks_progress = team_tasks.filter(status='IN_PROGRESS').count()
        tasks_completed = team_tasks.filter(status='DONE').count()
        tasks_overdue = team_tasks.filter(due_date__lt=now).exclude(status='DONE').count()
        
        # Members achievements
        members_data = []
        for m in team_members_qs:
            m_tasks = Task.objects.filter(organization=org, assignee=m)
            m_deals = Deal.objects.filter(organization=org, contact__assigned_to=m)
            members_data.append({
                "id": str(m.id),
                "name": f"{m.first_name} {m.last_name}",
                "role": m.role,
                "tasks_completed": m_tasks.filter(status='DONE').count(),
                "tasks_pending": m_tasks.exclude(status='DONE').count(),
                "deals_won": m_deals.filter(status='WON').count(),
                "pipeline_value": m_deals.filter(status='OPEN').aggregate(v=Sum('value'))['v'] or 0.0
            })
            
        # Recent Activity in Team
        activities = Activity.objects.filter(organization=org, performed_by_id__in=member_ids).select_related('performed_by').order_by('-activity_date')[:activity_limit]
        activities_list = [{
            "id": str(act.id),
            "type": act.type,
            "content": act.content,
            "performed_by": f"{act.performed_by.first_name} {act.performed_by.last_name}" if act.performed_by else "System",
            "time": act.activity_date.isoformat()
        } for act in activities]

        return {
            "mode": "MANAGER",
            "stats": {
                "total_revenue": total_revenue,
                "pipeline_value": pipeline_value,
                "active_deals": active_deals,
                "win_rate": round(win_rate, 1)
            },
            "tasks": {
                "todo": tasks_todo,
                "in_progress": tasks_progress,
                "completed": tasks_completed,
                "overdue": tasks_overdue
            },
            "members": members_data,
            "activities": activities_list
        }

    else:
        # EMPLOYEE (Sales Rep) mode: My Tasks, Due Today, Overdue, Completed, Assigned Leads, personal performance & recent activities
        my_tasks = Task.objects.filter(organization=org, assignee=user)
        total_tasks = my_tasks.count()
        tasks_todo = my_tasks.filter(status='TODO').count()
        tasks_progress = my_tasks.filter(status='IN_PROGRESS').count()
        tasks_completed = my_tasks.filter(status='DONE').count()
        
        tasks_due_today = my_tasks.filter(due_date__gte=today_start, due_date__lt=today_start + timedelta(days=1)).count()
        tasks_overdue = my_tasks.filter(due_date__lt=now).exclude(status='DONE').count()
        
        # Assigned Contacts/Leads
        my_contacts = Contact.objects.filter(organization=org, assigned_to=user)
        total_leads = my_contacts.filter(status='LEAD').count()
        total_customers = my_contacts.filter(status='CUSTOMER').count()
        
        my_deals = Deal.objects.filter(organization=org, contact__assigned_to=user)
        my_won_deals = my_deals.filter(status='WON').count()
        my_lost_deals = my_deals.filter(status='LOST').count()
        my_total_deals = my_won_deals + my_lost_deals
        win_rate = (my_won_deals / my_total_deals * 100) if my_total_deals > 0 else 0.0
        pipeline_value = my_deals.filter(status='OPEN').aggregate(val=Sum('value'))['val'] or 0.0
        
        # Recent activities
        activities = Activity.objects.filter(organization=org, performed_by=user).order_by('-activity_date')[:activity_limit]
        activities_list = [{
            "id": str(act.id),
            "type": act.type,
            "content": act.content,
            "performed_by": "Me",
            "time": act.activity_date.isoformat()
        } for act in activities]

        return {
            "mode": "EMPLOYEE",
            "tasks": {
                "total": total_tasks,
                "todo": tasks_todo,
                "in_progress": tasks_progress,
                "completed": tasks_completed,
                "due_today": tasks_due_today,
                "overdue": tasks_overdue
            },
            "leads": {
                "total_leads": total_leads,
                "total_customers": total_customers,
                "pipeline_value": pipeline_value,
                "win_rate": round(win_rate, 1)
            },
            "activities": activities_list
        }
