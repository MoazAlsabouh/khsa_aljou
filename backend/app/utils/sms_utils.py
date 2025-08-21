# import os
# قم باستيراد مكتبة SMS Gateway الخاصة بك هنا (مثال: twilio, nexmo)
# من أجل هذا الدليل، سنستخدم دالة وهمية.

# def send_sms(to_phone_number, message):
    # """
    # Sends an SMS message to a given phone number.
    # (This is a placeholder function; actual implementation depends on SMS Gateway API)
    # """
    # مثال على استخدام متغيرات البيئة (ستحتاج إلى تكوينها في .env)
    # sms_api_key = os.getenv("SMS_API_KEY")
    # sms_api_secret = os.getenv("SMS_API_SECRET")
    # sms_sender_id = os.getenv("SMS_SENDER_ID")

    # محاكاة إرسال رسالة واتساب
    # print(f"--- محاكاة إرسال رسالة واتساب (OTP) ---")
    # print(f"إلى: {to_phone_number}")
    # print(f"الرسالة: {message}")
    # print(f"--------------------------------------")
    # هنا ستكون منطق الاتصال بواجهة برمجة تطبيقات WhatsApp/SMS Gateway
    # مثال:
    # client = TwilioClient(sms_api_key, sms_api_secret)
    # client.messages.create(
    #     to=to_phone_number,
    #     from_=sms_sender_id,
    #     body=message
    # )
    # return True # افترض النجاح لأغراض العرض التوضيحي

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl

# دالة عامة لإرسال رسائل البريد الإلكتروني
def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using SMTP configuration from .env.
    Supports TLS or SSL based on environment variables.
    """
    sender_email = os.getenv("MAIL_SENDER_EMAIL")
    sender_name = os.getenv("MAIL_SENDER_NAME")
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER")
    smtp_port = int(os.getenv("MAIL_PORT", 587))
    use_tls = os.getenv("MAIL_USE_TLS", "True").lower() == 'true'
    use_ssl = os.getenv("MAIL_USE_SSL", "False").lower() == 'true'

    if not all([sender_email, mail_username, mail_password, smtp_server]):
        print("SMTP configuration missing in .env. Cannot send email.")
        return False

    from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email

    msg = MIMEMultipart()
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
                server.login(mail_username, mail_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                if use_tls:
                    server.starttls(context=ssl.create_default_context())
                server.login(mail_username, mail_password)
                server.send_message(msg)

        print(f"✅ Email sent to {to_email} successfully.")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False

# دالة إرسال رمز التحقق لأي غرض
def send_sms_verification_email(user, code: str, method: str = "email") -> bool:
    """
    Send verification code via email or (placeholder) SMS/WhatsApp.
    method: "email" or "sms"
    """
    if method == "email":
        subject = "رمز التحقق من بريدك الإلكتروني لتطبيق خسى الجوع"
        body = f"""مرحباً {user.name},

رمز التحقق الخاص بك هو: {code}

صالح لمدة 5 دقائق.
"""
        return send_email(user.email, subject, body)
    
    elif method == "sms":
        # دالة وهمية لإرسال رسالة SMS أو WhatsApp
        print(f"--- محاكاة إرسال رسالة OTP ---")
        print(f"إلى: {user.phone_number}")
        print(f"الرسالة: رمز التحقق الخاص بك هو: {code}")
        print(f"--------------------------------")
        return True

    else:
        print(f"طريقة الإرسال غير مدعومة: {method}")
        return False