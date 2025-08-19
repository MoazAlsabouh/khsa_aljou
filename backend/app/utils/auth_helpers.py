import random
import string
import uuid

def generate_verification_code(length=6):
    """Generates a random alphanumeric verification code (for email)."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_numeric_otp(length=6):
    """Generates a random numeric OTP of specified length (for phone)."""
    return ''.join(random.choices(string.digits, k=length))

def generate_unique_oauth_phone_placeholder():
    """Generates a unique placeholder for phone_number for OAuth users."""
    return f"oauth_{uuid.uuid4().hex[:10]}" # استخدام جزء من UUID لضمان التفرد وتناسب الطول
