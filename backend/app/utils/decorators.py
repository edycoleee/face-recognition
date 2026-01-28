"""
Common decorators for API routes
"""
from functools import wraps
from flask import request
from utils.response import error_response
from utils.logger import logger


def require_json(f):
    """
    Decorator to ensure request contains JSON data
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return error_response("Request must be JSON")
        return f(*args, **kwargs)
    return decorated_function


def require_fields(*required_fields):
    """
    Decorator to ensure required fields exist in JSON request
    
    Usage:
        @require_fields('image', 'user_id')
        def my_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            if not data:
                return error_response("No data provided")
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return error_response(f"Missing required fields: {', '.join(missing_fields)}")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def log_request(f):
    """
    Decorator to log API requests
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.info(f"API Request: {request.method} {request.path}")
        return f(*args, **kwargs)
    return decorated_function


def handle_exceptions(f):
    """
    Decorator to handle exceptions in API routes
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Unhandled exception in {f.__name__}: {str(e)}", exc_info=True)
            return error_response(f"Internal server error: {str(e)}", status_code=500)
    return decorated_function
