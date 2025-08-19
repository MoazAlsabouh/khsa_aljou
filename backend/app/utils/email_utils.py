import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl # تم الإضافة لاستخدام سياق SSL

# دوال إرسال البريد الإلكتروني
def send_email(to_email, subject, body):
    """
    Sends an email using SMTP configuration from .env.
    """
    sender_email = os.getenv("MAIL_SENDER_EMAIL")
    sender_name = os.getenv("MAIL_SENDER_NAME")
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER")
    smtp_port = int(os.getenv("MAIL_PORT", 587))
    use_tls = os.getenv("MAIL_USE_TLS", "True").lower() == 'true'
    use_ssl = os.getenv("MAIL_USE_SSL", "False").lower() == 'true'

    if not all([mail_username, mail_password, smtp_server]):
        print("SMTP configuration (MAIL_USERNAME, MAIL_PASSWORD, MAIL_SERVER) missing in .env. Cannot send email.")
        return False

    # تحديد عنوان المرسل مع الاسم إذا كان متاحًا
    from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email

    msg = MIMEMultipart()
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=ssl.create_default_context()) # دائماً استخدم starttls إذا كان المنفذ 587
            server.login(mail_username, mail_password)
            server.send_message(msg)
        print(f"Email sent to {to_email} successfully.")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False

def send_email_verification_code(email, code):
    """
    Sends an email with a verification code.
    """
    subject = "رمز التحقق من بريدك الإلكتروني لتطبيق خسى الجوع"
    body = f"مرحباً بك،\n\nرمز التحقق الخاص بك هو: {code}\n\nيرجى استخدام هذا الرمز لتأكيد بريدك الإلكتروني."
    return send_email(email, subject, body)