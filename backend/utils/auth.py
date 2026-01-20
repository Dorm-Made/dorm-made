from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated

from utils.password import verify_token

security = HTTPBearer()


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> str:
    """
    Dependency to extract and verify JWT token, returning the user ID.

    Args:
        credentials: HTTP Bearer token from request headers

    Returns:
        str: User ID from the JWT token

    Raises:
        HTTPException: If token is invalid or missing
    """
    try:
        user_id = verify_token(credentials.credentials)
        print(f"Auth received user_id: {user_id} (type: {type(user_id)})")
        # Return user_id as string (UUID)
        return str(user_id)
    except Exception as e:
        print(f"Error verifying token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
