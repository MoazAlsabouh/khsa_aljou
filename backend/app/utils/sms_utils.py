from app.utils.email_utils import send_email


def send_sms(to_phone_number: str, message: str) -> bool:
    """
    Placeholder for SMS Gateway / WhatsApp integration (e.g. Twilio, Infobip).
    Logs the dispatched message to server logs.
    """
    print(f"\n========================================================")
    print(f"📱 [SMS Dispatch] To: {to_phone_number}")
    print(f"📱 [Message]: {message}")
    print(f"========================================================\n")
    return True


def send_sms_verification_email(user, code: str, method: str = "email") -> bool:
    """
    Send phone verification code via email (or SMS simulation).
    Logs the OTP code to secure server console and dispatches asynchronously.
    """
    print(f"\n========================================================")
    print(f"🔐 [Phone OTP Code] User: {user.name} | Phone: {user.phone_number}")
    print(f"🔐 [Verification Code]: {code}")
    print(f"========================================================\n")

    if method == "email":
        subject = "رمز تأكيد رقم الهاتف - خسى الجوع"
        body = f"""مرحباً {user.name}،

رمز تأكيد رقم هاتفك الخاص بمنصة خسى الجوع هو: {code}

هذا الرمز صالح لمدة 5 دقائق.
"""
        return send_email(user.email, subject, body)
    
    elif method == "sms":
        return send_sms(user.phone_number, f"رمز التحقق الخاص بك هو: {code}")

    return False