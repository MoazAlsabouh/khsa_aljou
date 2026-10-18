import os
import smtplib
import threading
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _clean(val: str | None) -> str | None:
    if val and isinstance(val, str):
        return val.strip().strip('"').strip("'")
    return val


def _send_email_worker(to_email: str, subject: str, body: str):
    sender_email = _clean(os.getenv("MAIL_SENDER_EMAIL"))
    sender_name = _clean(os.getenv("MAIL_SENDER_NAME"))
    mail_username = _clean(os.getenv("MAIL_USERNAME"))
    mail_password = _clean(os.getenv("MAIL_PASSWORD"))
    smtp_server = _clean(os.getenv("MAIL_SERVER"))
    port_val = _clean(os.getenv("MAIL_PORT", "587"))
    try:
        smtp_port = int(port_val) if port_val else 587
    except ValueError:
        smtp_port = 587

    print(f"\n========================================================")
    print(f"📧 [Email Outbox] To: {to_email}")
    print(f"📧 [Subject]: {subject}")
    print(f"📧 [Body]:\n{body.strip()}")
    print(f"========================================================\n")

    missing = []
    if not smtp_server:
        missing.append("MAIL_SERVER")
    if not mail_username:
        missing.append("MAIL_USERNAME")
    if not mail_password:
        missing.append("MAIL_PASSWORD")
    if not sender_email:
        missing.append("MAIL_SENDER_EMAIL")

    if missing:
        print(f"ℹ️ Missing SMTP configuration on server: {', '.join(missing)}.")
        print("ℹ️ To deliver real emails to inboxes, set these in your Render Environment Variables.")
        return

    from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email

    msg = MIMEMultipart()
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context, timeout=10) as server:
                server.login(mail_username, mail_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                server.starttls(context=context)
                server.login(mail_username, mail_password)
                server.send_message(msg)
        print(f"✅ Email delivered to {to_email} successfully via {smtp_server}:{smtp_port}.")
    except Exception as e:
        print(f"⚠️ SMTP delivery error ({e}). Email code logged to console above.")


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