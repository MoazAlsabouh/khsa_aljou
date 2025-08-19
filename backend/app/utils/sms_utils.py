import os
# قم باستيراد مكتبة SMS Gateway الخاصة بك هنا (مثال: twilio, nexmo)
# من أجل هذا الدليل، سنستخدم دالة وهمية.

def send_sms(to_phone_number, message):
    """
    Sends an SMS message to a given phone number.
    (This is a placeholder function; actual implementation depends on SMS Gateway API)
    """
    # مثال على استخدام متغيرات البيئة (ستحتاج إلى تكوينها في .env)
    # sms_api_key = os.getenv("SMS_API_KEY")
    # sms_api_secret = os.getenv("SMS_API_SECRET")
    # sms_sender_id = os.getenv("SMS_SENDER_ID")

    # محاكاة إرسال رسالة واتساب
    print(f"--- محاكاة إرسال رسالة واتساب (OTP) ---")
    print(f"إلى: {to_phone_number}")
    print(f"الرسالة: {message}")
    print(f"--------------------------------------")
    # هنا ستكون منطق الاتصال بواجهة برمجة تطبيقات WhatsApp/SMS Gateway
    # مثال:
    # client = TwilioClient(sms_api_key, sms_api_secret)
    # client.messages.create(
    #     to=to_phone_number,
    #     from_=sms_sender_id,
    #     body=message
    # )
    return True # افترض النجاح لأغراض العرض التوضيحي
