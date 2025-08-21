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
from email.utils import formataddr

def send_sms(to_email: str, subject: str, message: str) -> bool:
    """
    إرسال إيميل باستخدام إعدادات SMTP من متغيرات البيئة
    """
    mail_server = os.getenv("MAIL_SERVER")
    mail_port = int(os.getenv("MAIL_PORT", 587))
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")
    sender_name = os.getenv("MAIL_SENDER_NAME", "MyApp")
    sender_email = os.getenv("MAIL_SENDER_EMAIL")

    msg = MIMEText(message, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = formataddr((sender_name, sender_email))
    msg["To"] = to_email

    try:
        with smtplib.SMTP(mail_server, mail_port) as server:
            server.starttls()
            server.login(mail_username, mail_password)
            server.sendmail(sender_email, [to_email], msg.as_string())
        print(f"✅ تم إرسال الإيميل إلى {to_email}")
        return True
    except Exception as e:
        print(f"❌ خطأ أثناء إرسال الإيميل: {e}")
        return False


def send_sms_verification_email(user, code: str) -> bool:
    """
    إرسال رمز التحقق الخاص برقم الهاتف إلى إيميل المستخدم
    """
    subject = "رمز التحقق من رقم الهاتف"
    message = f"""مرحبا {user.name},

رمز التحقق الخاص بك هو: {code}

صالح لمدة 5 دقائق.
"""
    return send_sms(user.email, subject, message)