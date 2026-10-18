import os
import smtplib
import threading
import ssl
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _clean(val: str | None) -> str | None:
    if val and isinstance(val, str):
        return val.strip().strip('"').strip("'")
    return val


def _is_true(val: str | None, default: bool = False) -> bool:
    if val is None:
        return default
    return str(val).strip().lower() in ("true", "1", "yes", "on")


def _send_email_worker(to_email: str, subject: str, body: str):
    sender_email = _clean(os.getenv("MAIL_SENDER_EMAIL")) or "onboarding@resend.dev"
    sender_name = _clean(os.getenv("MAIL_SENDER_NAME")) or "خسى الجوع"

    # API Keys for HTTPS email delivery (Completely bypasses Render SMTP port blocks)
    resend_api_key = _clean(os.getenv("RESEND_API_KEY"))
    brevo_api_key = _clean(os.getenv("BREVO_API_KEY"))
    sendgrid_api_key = _clean(os.getenv("SENDGRID_API_KEY"))

    print(f"\n========================================================")
    print(f"📧 [Email Outbox] To: {to_email}")
    print(f"📧 [Subject]: {subject}")
    print(f"📧 [Body]:\n{body.strip()}")
    print(f"========================================================\n")

    # 1. إرسال عبر Resend HTTPS API (منفذ 443 مفتوح دائماً)
    if resend_api_key:
        try:
            print("🚀 Sending email via Resend HTTPS API (Port 443)...")
            from_addr = f"{sender_name} <{sender_email}>" if sender_email and "@" in sender_email and not sender_email.endswith("@gmail.com") else f"{sender_name} <onboarding@resend.dev>"
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_addr,
                    "to": [to_email],
                    "subject": subject,
                    "text": body
                },
                timeout=10
            )
            if res.status_code in (200, 201):
                print(f"✅ Email delivered to {to_email} successfully via Resend API.")
                return
            else:
                print(f"⚠️ Resend API returned error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"⚠️ Resend API failed: {e}")

    # 2. إرسال عبر Brevo HTTPS API (منفذ 443 مفتوح دائماً)
    if brevo_api_key:
        try:
            print("🚀 Sending email via Brevo HTTPS API (Port 443)...")
            res = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "textContent": body
                },
                timeout=10
            )
            if res.status_code in (200, 201):
                print(f"✅ Email delivered to {to_email} successfully via Brevo API.")
                return
            else:
                print(f"⚠️ Brevo API returned error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"⚠️ Brevo API failed: {e}")

    # 3. إرسال عبر SendGrid HTTPS API (منفذ 443 مفتوح دائماً)
    if sendgrid_api_key:
        try:
            print("🚀 Sending email via SendGrid HTTPS API (Port 443)...")
            res = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {sendgrid_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": sender_email, "name": sender_name},
                    "subject": subject,
                    "content": [{"type": "text/plain", "value": body}]
                },
                timeout=10
            )
            if res.status_code in (200, 202):
                print(f"✅ Email delivered to {to_email} successfully via SendGrid API.")
                return
            else:
                print(f"⚠️ SendGrid API returned error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"⚠️ SendGrid API failed: {e}")

    # 4. محاولة الإرسال عبر خادم SMTP التقليدي
    mail_username = _clean(os.getenv("MAIL_USERNAME"))
    mail_password = _clean(os.getenv("MAIL_PASSWORD"))
    smtp_server = _clean(os.getenv("MAIL_SERVER"))
    port_val = _clean(os.getenv("MAIL_PORT", "587"))
    try:
        smtp_port = int(port_val) if port_val else 587
    except ValueError:
        smtp_port = 587

    use_ssl = _is_true(os.getenv("MAIL_USE_SSL"), default=(smtp_port == 465))
    use_tls = _is_true(os.getenv("MAIL_USE_TLS"), default=(smtp_port == 587 and not use_ssl))

    if not all([smtp_server, mail_username, mail_password, sender_email]):
        print("ℹ️ Missing SMTP configuration. Email printed to console logs above.")
        return

    from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email
    msg = MIMEMultipart()
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    try:
        print(f"🔄 Connecting to SMTP {smtp_server}:{smtp_port} (SSL: {use_ssl}, TLS: {use_tls})...")
        context = ssl.create_default_context()
        if use_ssl:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context, timeout=8) as server:
                server.login(mail_username, mail_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=8) as server:
                if use_tls:
                    server.starttls(context=context)
                server.login(mail_username, mail_password)
                server.send_message(msg)
        print(f"✅ Email delivered to {to_email} successfully via {smtp_server}:{smtp_port}.")
    except Exception as e:
        print(f"⚠️ SMTP delivery error: {type(e).__name__}: {e}")
        print("💡 Note: Render Free Tier blocks outbound SMTP ports (25, 465, 587). To send real emails from Render, add RESEND_API_KEY or BREVO_API_KEY in Render Environment Variables.")


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