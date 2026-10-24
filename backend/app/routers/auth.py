from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, AuthResponse
from app.schemas.user import UserResponse
from app.security.auth import hash_password, verify_password, create_access_token, DUMMY_PASSWORD_HASH
from app.security.deps import get_current_user
from app.security.rate_limiter import auth_rate_limiter
from app.config import settings

router = APIRouter(prefix="/api", tags=["Authentication"])


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegister,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new student account.
    Checks rate limits, email uniqueness, password rules, hashes password with bcrypt, sets httpOnly cookie.
    """
    auth_rate_limiter.check_register(request)

    normalized_email = payload.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    hashed_pw = hash_password(payload.password)
    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hashed_pw,
        auth_provider="local",
        daily_study_minutes=payload.daily_study_minutes,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue JWT and set httpOnly cookie
    token = create_access_token(data={"sub": user.id, "email": user.email})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
        path="/"
    )

    return AuthResponse(
        message="Registration successful.",
        user=UserResponse.model_validate(user)
    )


@router.post("/auth/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
def login_user(
    payload: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user via email and password.
    Checks rate limits, prevents timing enumeration with dummy verification, sets httpOnly JWT cookie.
    """
    auth_rate_limiter.check_login(request, email=payload.email)

    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Constant-time mitigation: if user does not exist, run dummy hash verification
    if not user or not user.password_hash:
        verify_password(payload.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Verify actual password hash
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(data={"sub": user.id, "email": user.email})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
        path="/"
    )

    return AuthResponse(
        message="Login successful.",
        user=UserResponse.model_validate(user)
    )


@router.post("/auth/logout", status_code=status.HTTP_200_OK)
def logout_user(response: Response):
    """
    Clears the httpOnly access_token cookie.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
@router.get("/auth/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_authenticated_user(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user based on httpOnly cookie.
    Protected endpoint.
    """
    return UserResponse.model_validate(current_user)
