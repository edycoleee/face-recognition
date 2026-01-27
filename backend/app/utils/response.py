# app/utils/response.py

def success_response(message="Success", data=None, status_code=200):
    """
    Standard success response format
    """
    return {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }, status_code

def error_response(message="Error", data=None, status_code=400):
    """
    Standard error response format
    """
    return {
        "success": False,
        "message": message,
        "data": data if data is not None else {}
    }, status_code
