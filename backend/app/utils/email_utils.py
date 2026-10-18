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


def build_verification_email_html(code: str) -> str:
    """
    قالب بريد إلكتروني فائق الجمال بتصميم عصري وهوية منصة خسى الجوع.
    متوافق 100% مع كافة برامج وتطبيقات البريد (Gmail, Apple Mail, Outlook).
    """
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز التحقق - خسى الجوع</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; direction: rtl; text-align: right;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- الحاوية المركزية -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- الترويسة الرئيسية مع تدرج أحمر وبرتقالي دافئ وشعار المنصة -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 34px 24px; text-align: center;">
              <div style="display: inline-block; width: 54px; height: 54px; line-height: 54px; background-color: #ffffff; color: #dc2626; font-size: 28px; font-weight: 900; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.18);">
                خ
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">خسى الجوع</h1>
              <p style="color: rgba(255, 255, 255, 0.92); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
                أسرع توصيل للمطاعم والوجبات في سوريا
              </p>
            </td>
          </tr>

          <!-- جسم الرسالة -->
          <tr>
            <td style="padding: 34px 28px 24px 28px;">
              <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px; font-weight: 800;">
                مرحباً بك! 👋
              </h2>
              <p style="color: #475569; margin: 0 0 22px 0; font-size: 15px; line-height: 1.6;">
                شكراً لتسجيلك في منصة <strong>خسى الجوع</strong>. لتفعيل حسابك ومتابعة طلباتك وتتبع موقع الوجبات على الخريطة لحظة بلحظة، يرجى إدخال رمز التحقق التالي:
              </p>

              <!-- بطاقة رمز التحقق المميزة -->
              <table role="presentation" width="100%" style="margin: 24px 0; background-color: #fff1f2; border: 2px dashed #f43f5e; border-radius: 16px;">
                <tr>
                  <td style="padding: 22px 16px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; color: #e11d48; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      رمز التأكيد (OTP)
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #be123c; direction: ltr; display: inline-block;">
                      {code}
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #9f1239; font-weight: 500;">
                      ⏳ هذا الرمز صالح لمدة <strong>15 دقيقة</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- صندوق تنبيه أمان -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px 16px; border-right: 4px solid #f59e0b; margin-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                  🔒 <strong>تنبيه أمان:</strong> هذا الرمز خاص بك وحدك. فريق خسى الجوع لن يطلب منك هذا الرمز أبداً تحت أي ظرف.
                </p>
              </div>

              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0;">
                إذا لم تكن قد أنشأت هذا الحساب، يمكنك ببساطة تجاهل هذه الرسالة ولن يتم تفعيل أي شيء.
              </p>
            </td>
          </tr>

          <!-- تذييل الصفحة -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                © 2026 <strong>منصة خسى الجوع</strong> - جميع الحقوق محفوظة
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #cbd5e1;">
                سوريا | تتبع مباشر للطلبات عبر GPS ودعم العملة السورية الجديدة
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _send_email_worker(to_email: str, subject: str, body: str, html: str | None = None):
    sender_email = _clean(os.getenv("MAIL_SENDER_EMAIL")) or "onboarding@resend.dev"
    sender_name = _clean(os.getenv("MAIL_SENDER_NAME")) or "خسى الجوع"

    # API Keys & Webhook URLs for HTTPS email delivery
    google_script_url = _clean(os.getenv("GOOGLE_SCRIPT_MAIL_URL"))
    resend_api_key = _clean(os.getenv("RESEND_API_KEY"))
    brevo_api_key = _clean(os.getenv("BREVO_API_KEY"))
    sendgrid_api_key = _clean(os.getenv("SENDGRID_API_KEY"))

    print(f"\n========================================================")
    print(f"📧 [Email Outbox] To: {to_email}")
    print(f"📧 [Subject]: {subject}")
    print(f"📧 [Body]:\n{body.strip()}")
    print(f"========================================================\n")

    # 0. إرسال عبر Google Apps Script Web App (يدعم HTML و النص العادي)
    if google_script_url:
        try:
            print("🚀 Sending email via Google Apps Script HTTPS Web App (Port 443)...")
            res = requests.post(
                google_script_url,
                json={
                    "to": to_email,
                    "subject": subject,
                    "body": body,
                    "html": html or body,
                    "htmlBody": html or body
                },
                timeout=12,
                allow_redirects=True
            )
            if res.status_code in (200, 201, 302) or res.ok:
                print(f"✅ Email delivered to {to_email} successfully via Google Apps Script.")
                return
            else:
                print(f"⚠️ Google Script returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"⚠️ Google Script failed: {e}")

    # 1. إرسال عبر Resend HTTPS API
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
                    "text": body,
                    "html": html or body
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

    # 2. إرسال عبر Brevo HTTPS API
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
                    "textContent": body,
                    "htmlContent": html or body
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

    # 3. إرسال عبر SendGrid HTTPS API
    if sendgrid_api_key:
        try:
            print("🚀 Sending email via SendGrid HTTPS API (Port 443)...")
            content = [{"type": "text/plain", "value": body}]
            if html:
                content.append({"type": "text/html", "value": html})
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
                    "content": content
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
    msg = MIMEMultipart('alternative')
    msg['From'] = from_header
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    if html:
        msg.attach(MIMEText(html, 'html', 'utf-8'))

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


def send_email(to_email: str, subject: str, body: str, html: str | None = None) -> bool:
    """
    Sends email asynchronously in a background thread to prevent blocking
    the Gunicorn worker processes.
    """
    thread = threading.Thread(target=_send_email_worker, args=(to_email, subject, body, html), daemon=True)
    thread.start()
    return True


def send_email_verification_code(email: str, code: str) -> bool:
    """
    Sends a verification code email for account/email confirmation with rich HTML and plain text fallback.
    """
    subject = "رمز التحقق من بريدك الإلكتروني - خسى الجوع"
    
    # نص بسيط ومنسق لعرض النص الصافي بدقة
    body = f"""مرحباً بك في منصة خسى الجوع،

رمز التحقق الخاص بك هو:
{code}

يرجى إدخال هذا الرمز في الموقع لتفعيل حسابك ومتابعة طلباتك.
(صلاحية هذا الرمز 15 دقيقة).
"""
    html = build_verification_email_html(code)
    return send_email(email, subject, body, html=html)