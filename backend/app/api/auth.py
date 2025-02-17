import re
from typing import Optional
from datetime import datetime, timedelta

from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.core.config import get_settings
from app.core.logger import get_auth_logger
from app.db.base import get_db
from app.db.models import User

####################################################
#############     MODELS     #######################
####################################################

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    signup_password: str


####################################################
##############     ACTORS     ######################
####################################################

router = APIRouter()
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = get_auth_logger()

####################################################
#############     HELPER FUNCTIONS     #############
####################################################

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def validate_password(password: str) -> bool:
    if len(password) < 10:
        return False
    return bool(re.search(r'[a-zA-Z]', password) and re.search(r'\d', password))

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=1))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )

    token = request.cookies.get("auth_token")
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise credentials_exception

    return user

###################################################
#############     ROUTES     ######################
###################################################

@router.post("/signup")
async def signup(request: Request, user: UserSignup, db: Session = Depends(get_db)):

    try:
        client_ip = request.client.host

        if user.signup_password != settings.SIGNUP_SECRET_PASSWORD:
            logger.warning(f"Invalid signup password attempt from IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Invalid signup credentials", "error_type": "INVALID_SIGNUP_PASSWORD"}
            )

        if not validate_password(user.password):
            logger.warning(f"Signup failed: Password complexity requirements not met. IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password does not meet complexity requirements"
            )

        if db.query(User).filter(User.email == user.email).first():
            logger.warning(f"Signup attempt with existing email: {user.email}. IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        hashed_password = get_password_hash(user.password)
        new_user = User(name=user.name, email=user.email, hashed_password=hashed_password)

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"New user registered: {user.email}. IP: {client_ip}")
        return {"message": "User created successfully"}

    except Exception as e:
        logger.critical(f"Signup failed! {e}")
        return {"message": "Catastrophic Failure in signup"}

@router.post("/login")
async def login(request: Request, response: Response, login_data: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host
    user = db.query(User).filter(User.email == login_data.username).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email: {login_data.username}. IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_token({"sub": user.email})
    refresh_token = create_token({"sub": user.email}, timedelta(days=7))

    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite='lax',
        max_age=3600
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite='lax',
        max_age=604800
    )

    logger.info(f"Successful login for user: {user.email}. IP: {client_ip}")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(request: Request, response: Response, auth_token: Optional[str] = Cookie(None)):
    if auth_token:
        try:
            payload = decode_token(auth_token)
            user_email = payload.get('sub', 'Unknown')
            logger.info(f"Logout for user: {user_email}. IP: {request.client.host}")
        except:
            logger.info(f"Logout attempt. IP: {request.client.host}")

    response.delete_cookie("auth_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@router.get("/status")
async def get_auth_status(current_user: User = Depends(get_current_user)):
    return {
        "user": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email
        }
    }

@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host

    if not refresh_token:
        logger.warning(f"Auth Refresh failed: Refresh token missing. IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    try:

        payload = decode_token(refresh_token)
        if not payload or "sub" not in payload:
            raise ValueError("Invalid token payload")

        user = db.query(User).filter(User.email == payload["sub"]).first()
        if not user:
            raise ValueError("User not found")

        access_token = create_token(
            data={"sub": user.email},
            expires_delta=timedelta(hours=1)
        )
        new_refresh_token = create_token(
            data={"sub": user.email},
            expires_delta=timedelta(days=7)
        )

        cookie_settings = {
            "httponly": True,
            "secure": True,
            "samesite": 'lax'
        }

        response.set_cookie(
            key="auth_token",
            value=access_token,
            max_age=3600,  # 1 hour
            **cookie_settings
        )
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=604800,  # 7 days
            **cookie_settings
        )

        logger.info(f"Successful token refresh for user: {user.email}. IP: {client_ip}")
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError as e:
        logger.warning(f"Auth Refresh failed: {str(e)}. IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {str(e)}. IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during token refresh"
        )
