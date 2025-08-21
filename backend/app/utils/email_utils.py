import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using SMTP configuration from .env.
    Supports TLS for Office365 (port 587).
    """
    sender_email = os.getenv("MAIL_SENDER_EMAIL")
    sender_name = os.getenv("MAIL_SENDER_NAME")
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER")
    smtp_port = int(os.getenv("MAIL_PORT", 587))

    if not all([mail_username, mail_password, smtp_server, sender_email]):
        print("❌ Missing SMTP configuration in environment variables.")
        return False

    # إعداد عنوان المرسل (مع الاسم إذا متوفر)
    from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email

    # تجهيز الرسالة
    msg = MIMEMultipart()
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)  # نستخدم TLS مع Office365
            server.login(mail_username, mail_password)
            server.send_message(msg)

        print(f"✅ Email sent to {to_email} successfully.")
        return True

    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False


def send_email_verification_code(email: str, code: str) -> bool:
    """
    Sends a verification code email for account/email confirmation.
    """
    subject = "رمز التحقق من بريدك الإلكتروني لتطبيق خسى الجوع"
    body = f"""مرحباً بك،

رمز التحقق الخاص بك هو: {code}

يرجى استخدام هذا الرمز لتأكيد بريدك الإلكتروني.
"""
    return send_email(email, subject, body)