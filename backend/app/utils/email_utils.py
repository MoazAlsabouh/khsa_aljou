import os
import smtplib
import threading
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _send_email_worker(to_email: str, subject: str, body: str):
    sender_email = os.getenv("MAIL_SENDER_EMAIL")
    sender_name = os.getenv("MAIL_SENDER_NAME")
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER")
    smtp_port = int(os.getenv("MAIL_PORT", 587))

    print(f"\n========================================================")
    print(f"📧 [Email Outbox] To: {to_email}")
    print(f"📧 [Subject]: {subject}")
    print(f"📧 [Body]:\n{body.strip()}")
    print(f"========================================================\n")

    if not all([mail_username, mail_password, smtp_server, sender_email]):
        print("ℹ️ Missing SMTP configuration. Email printed to console logs above.")
        return

    from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email

    msg = MIMEMultipart()
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port, timeout=4) as server:
            server.starttls(context=context)
            server.login(mail_username, mail_password)
            server.send_message(msg)
        print(f"✅ Email delivered to {to_email} successfully.")
    except Exception as e:
        print(f"⚠️ SMTP delivery warning ({e}). Email code logged to console above.")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends email asynchronously in a background thread to prevent blocking
    the Gunicorn worker processes.
    """
    thread = threading.Thread(target=_send_email_worker, args=(to_email, subject, body), daemon=True)
    thread.start()
    return True


def send_email_verification_code(email: str, code: str) -> bool:
    """
    Sends a verification code email for account/email confirmation.
    """
    subject = "رمز التحقق من بريدك الإلكتروني - خسى الجوع"
    body = f"""مرحباً بك في منصة خسى الجوع،

رمز التحقق الخاص بك هو: {code}

يرجى إدخال هذا الرمز لتفعيل حسابك ومتابعة طلباتك.
"""
    return send_email(email, subject, body)