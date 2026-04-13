"""
Email Notification Service for SmartBuy

Async SMTP email sender (aiosmtplib) with branded HTML templates.
Two email types:
  1. Welcome email — sent on user signup
  2. Price alert email — sent when a tracked product hits target price

All emails use inline CSS + table layout for max email-client compatibility.
Failures are logged but never crash the calling code.
"""

import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)


def _settings():
    return get_settings()


def _frontend_url() -> str:
    return _settings().frontend_url.rstrip("/")


def _dashboard_url() -> str:
    return f"{_frontend_url()}/dashboard"


def _is_email_configured() -> bool:
    """Returns True if SMTP credentials are present."""
    s = _settings()
    return bool(s.smtp_username and s.smtp_password and s.smtp_host)


async def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via SMTP. Returns True on success, False otherwise.

    Never raises — all errors caught and logged.
    """
    if not _is_email_configured():
        logger.warning("SMTP not configured — skipping email send to %s", to_email)
        return False

    s = _settings()

    try:
        message = MIMEMultipart("alternative")
        message["From"] = f"{s.smtp_from_name} <{s.smtp_from_email}>"
        message["To"] = to_email
        message["Subject"] = subject

        plain = f"This email requires HTML support. Visit {_frontend_url()} to view in browser."
        message.attach(MIMEText(plain, "plain"))
        message.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            message,
            hostname=s.smtp_host,
            port=s.smtp_port,
            username=s.smtp_username,
            password=s.smtp_password,
            start_tls=True,
        )

        logger.info("Email sent to %s: %s", to_email, subject)
        return True

    except aiosmtplib.SMTPAuthenticationError:
        logger.error("SMTP auth failed — check SMTP_USERNAME and SMTP_PASSWORD")
        return False
    except aiosmtplib.SMTPConnectError:
        logger.error("Could not connect to SMTP server %s:%s", s.smtp_host, s.smtp_port)
        return False
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


# ── Templates ─────────────────────────────────────────────────────────────────


def _base_template(content: str) -> str:
    """Wraps content in branded dark-themed HTML email template."""
    fe = _frontend_url()
    db = _dashboard_url()
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartBuy</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background-color:#1e293b; border-radius:12px; overflow:hidden; border:1px solid #334155;">
          <tr>
            <td style="padding:32px 40px 24px; text-align:center; border-bottom:1px solid #334155;">
              <h1 style="margin:0; font-size:28px; font-weight:700; color:#ffffff;">🛒 SmartBuy</h1>
              <p style="margin:8px 0 0; font-size:14px; color:#94a3b8;">Compare Prices. Track Drops. Save Money.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              {content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px; border-top:1px solid #334155; text-align:center;">
              <p style="margin:0 0 8px; font-size:13px; color:#64748b;">
                <a href="{fe}" style="color:#6c63ff; text-decoration:none;">Home</a>
                &nbsp;·&nbsp;
                <a href="{db}" style="color:#6c63ff; text-decoration:none;">Dashboard</a>
                &nbsp;·&nbsp;
                <a href="{fe}/faq" style="color:#6c63ff; text-decoration:none;">FAQ</a>
                &nbsp;·&nbsp;
                <a href="{fe}/blog" style="color:#6c63ff; text-decoration:none;">Blog</a>
              </p>
              <p style="margin:0; font-size:12px; color:#475569;">&copy; 2026 SmartBuy — Your AI-powered price comparison platform</p>
              <p style="margin:8px 0 0; font-size:11px; color:#475569;">You're receiving this because you have an account on SmartBuy.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _button(text: str, url: str, color: str = "#6c63ff") -> str:
    return (
        f'<a href="{url}" target="_blank" style="display:inline-block; padding:14px 28px; '
        f'background-color:{color}; color:#ffffff; text-decoration:none; border-radius:8px; '
        f'font-size:15px; font-weight:600; text-align:center;">{text}</a>'
    )


# ── Welcome Email ─────────────────────────────────────────────────────────────


async def send_welcome_email(to_email: str) -> bool:
    """Send a welcome email to a newly signed-up user."""
    subject = "Welcome to SmartBuy! 🎉 Start Saving Today"
    fe = _frontend_url()
    db = _dashboard_url()

    content = f"""
    <h2 style="margin:0 0 16px; font-size:22px; color:#ffffff;">Welcome to SmartBuy! 🎉</h2>
    <p style="font-size:15px; color:#cbd5e1; line-height:1.7; margin:0 0 20px;">
      Hi there! Thanks for joining SmartBuy — your AI-powered price comparison platform.
      We help you find the best deals across Amazon, Flipkart, Croma, and 10+ other stores.
    </p>
    <h3 style="margin:0 0 12px; font-size:16px; color:#ffffff;">Here's what you can do:</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:8px 0;"><p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.6;">✅ <strong style="color:#ffffff;">Compare Prices</strong> — Search and see prices from 10+ platforms side by side</p></td></tr>
      <tr><td style="padding:8px 0;"><p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.6;">📊 <strong style="color:#ffffff;">Track Price History</strong> — Interactive charts of historical prices</p></td></tr>
      <tr><td style="padding:8px 0;"><p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.6;">🤖 <strong style="color:#ffffff;">AI Predictions</strong> — ML model forecasts price drops</p></td></tr>
      <tr><td style="padding:8px 0;"><p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.6;">🔔 <strong style="color:#ffffff;">Smart Alerts</strong> — Get notified when prices hit your target</p></td></tr>
      <tr><td style="padding:8px 0;"><p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.6;">🏷️ <strong style="color:#ffffff;">Coupon Codes</strong> — Active codes to save even more</p></td></tr>
    </table>
    <div style="margin:28px 0; text-align:center;">{_button("Start Searching Products", fe, "#6c63ff")}</div>
    <div style="margin:16px 0; text-align:center;">{_button("Go to Dashboard", db, "#1d9e75")}</div>
    <p style="font-size:13px; color:#64748b; line-height:1.6; margin:24px 0 0; text-align:center;">
      Happy shopping! 🛍️<br>— The SmartBuy Team
    </p>
    """

    return await _send_email(to_email, subject, _base_template(content))


# ── Price Alert Email ─────────────────────────────────────────────────────────


async def send_price_alert_email(
    to_email: str,
    product_name: str,
    product_image_url: Optional[str],
    target_price: float,
    current_price: float,
    platform: str,
    product_url: str,
    product_id: str,
) -> bool:
    """Send a price alert email when a tracked product hits the target price.

    Args:
        product_url: Direct e-commerce URL (Amazon, Flipkart, etc.)
        product_id: SmartBuy product UUID for internal link
    """
    fe = _frontend_url()
    db = _dashboard_url()

    savings = target_price - current_price
    subject = f"🔔 Price Drop Alert: {product_name} is now ₹{current_price:,.0f}!"

    image_section = ""
    if product_image_url:
        image_section = (
            f'<div style="text-align:center; margin:0 0 20px;">'
            f'<img src="{product_image_url}" alt="{product_name}" '
            f'style="max-width:200px; max-height:200px; border-radius:8px; border:1px solid #334155;"/>'
            f"</div>"
        )

    platform_display = {
        "amazon": "Amazon.in",
        "flipkart": "Flipkart",
        "croma": "Croma",
    }.get(platform.lower(), platform.replace("_", " ").title())

    savings_section = ""
    if savings > 0:
        savings_section = (
            f'<div style="text-align:center; margin:16px 0;">'
            f'<span style="display:inline-block; background-color:#064e3b; color:#6ee7b7; '
            f'padding:8px 20px; border-radius:20px; font-size:14px; font-weight:600;">'
            f"🎉 You save ₹{savings:,.0f} below your target!"
            f"</span></div>"
        )

    # Fallback for missing product URL
    buy_url = product_url or f"{fe}/product/{product_id}"

    content = f"""
    <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; text-align:center;">🔔 Price Drop Alert!</h2>
    <p style="font-size:15px; color:#94a3b8; text-align:center; margin:0 0 24px;">
      A product on your watchlist just hit your target price.
    </p>
    {image_section}
    <h3 style="margin:0 0 16px; font-size:18px; color:#ffffff; text-align:center; line-height:1.4;">{product_name}</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a; border-radius:8px; border:1px solid #334155; margin:0 0 20px;">
      <tr>
        <td style="padding:20px; text-align:center; border-right:1px solid #334155;" width="50%">
          <p style="margin:0 0 4px; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Current Price</p>
          <p style="margin:0; font-size:28px; font-weight:700; color:#10b981;">₹{current_price:,.0f}</p>
          <p style="margin:4px 0 0; font-size:13px; color:#94a3b8;">on {platform_display}</p>
        </td>
        <td style="padding:20px; text-align:center;" width="50%">
          <p style="margin:0 0 4px; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Your Target</p>
          <p style="margin:0; font-size:28px; font-weight:700; color:#ffffff;">₹{target_price:,.0f}</p>
          <p style="margin:4px 0 0; font-size:13px; color:#94a3b8;">alert price</p>
        </td>
      </tr>
    </table>
    {savings_section}
    <div style="margin:28px 0 12px; text-align:center;">{_button(f"Buy Now on {platform_display}", buy_url, "#10b981")}</div>
    <div style="margin:12px 0; text-align:center;">{_button("View Comparison on SmartBuy", f"{fe}/product/{product_id}", "#6c63ff")}</div>
    <div style="margin:12px 0; text-align:center;">{_button("Go to Dashboard", db, "#475569")}</div>
    <p style="font-size:13px; color:#64748b; line-height:1.6; margin:24px 0 0; text-align:center;">
      ⚡ Prices change frequently — grab this deal before it's gone!
    </p>
    """

    return await _send_email(to_email, subject, _base_template(content))


# ── Helper: Get user email by user_id ─────────────────────────────────────────


async def get_user_email(user_id: str) -> Optional[str]:
    """Fetch a user's email from Supabase Auth using their UUID. Returns None on failure."""
    try:
        from app.database import get_db

        db = get_db()
        response = db.auth.admin.get_user_by_id(user_id)
        if response and response.user:
            return response.user.email
        return None
    except Exception as exc:
        logger.error("Failed to fetch email for user %s: %s", user_id, exc)
        return None
