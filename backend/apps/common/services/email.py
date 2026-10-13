import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class EmailNotificationService:
    """
    Email Notification Service.
    Primary:    Brevo (Sendinblue) HTTP API — uses built-in urllib, no extra packages needed.
    Fallback 1: Django send_mail (SMTP via settings).
    Fallback 2: Direct raw SMTP.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: Optional[bool] = None,
    ):
        self._host = host
        self._port = port
        self._user = user
        self._password = password
        self._use_tls = use_tls

    # --- Brevo ---

    @property
    def brevo_api_key(self) -> str:
        return (
            os.environ.get('BREVO_API_KEY')
            or getattr(settings, 'BREVO_API_KEY', '')
        )

    # --- SMTP fallback properties ---

    @property
    def host(self) -> str:
        return (
            self._host
            or os.environ.get('SMTP_HOST')
            or getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        )

    @property
    def port(self) -> int:
        raw = (
            self._port
            or os.environ.get('SMTP_PORT')
            or getattr(settings, 'EMAIL_PORT', 587)
        )
        try:
            return int(raw)
        except Exception:
            return 587

    @property
    def user(self) -> str:
        return (
            self._user
            or os.environ.get('SMTP_USER')
            or getattr(settings, 'EMAIL_HOST_USER', '')
        )

    @property
    def password(self) -> str:
        raw = (
            self._password
            or os.environ.get('SMTP_PASS')
            or getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        )
        return str(raw).replace(' ', '')

    @property
    def use_tls(self) -> bool:
        if self._use_tls is not None:
            return self._use_tls
        return getattr(settings, 'EMAIL_USE_TLS', True)

    @property
    def from_email(self) -> str:
        return (
            getattr(settings, 'DEFAULT_FROM_EMAIL', '')
            or self.user
            or 'mintanacrm@gmail.com'
        )

    # --- Main send method ---

    def send_email(
        self,
        subject: str,
        body: str,
        recipients: List[str],
        html_body: Optional[str] = None,
        fail_silently: bool = False,
    ) -> bool:
        if not recipients:
            logger.warning("[EmailNotificationService] No recipients provided.")
            return False

        clean_recipients = [r.strip() for r in recipients if r and r.strip()]
        if not clean_recipients:
            logger.warning("[EmailNotificationService] Recipient list is empty after cleaning.")
            return False

        # Attempt 1: Brevo HTTP API (uses built-in urllib — no extra packages)
        if self.brevo_api_key:
            try:
                result = self._send_via_brevo(subject, body, clean_recipients, html_body)
                if result:
                    logger.info(f"[EmailNotificationService] Brevo sent '{subject}' to {clean_recipients}")
                    return True
            except Exception as e:
                logger.error(f"[EmailNotificationService] Brevo failed for '{subject}': {e}. Falling back to SMTP...")

        # Attempt 2: Django send_mail (SMTP)
        try:
            sent_count = send_mail(
                subject=subject,
                message=body,
                from_email=self.from_email,
                recipient_list=clean_recipients,
                html_message=html_body,
                fail_silently=False,
            )
            if sent_count > 0:
                logger.info(f"[EmailNotificationService] Django SMTP sent '{subject}' to {clean_recipients}")
                return True
        except Exception as e:
            logger.error(f"[EmailNotificationService] Django SMTP failed for '{subject}': {e}. Trying raw SMTP...")

        # Attempt 3: Raw SMTP fallback
        try:
            self._send_raw_smtp(subject, body, clean_recipients, html_body)
            logger.info(f"[EmailNotificationService] Raw SMTP sent '{subject}' to {clean_recipients}")
            return True
        except Exception as smtp_err:
            logger.error(f"[EmailNotificationService] Raw SMTP fallback failed for '{subject}': {smtp_err}")
            if not fail_silently:
                raise smtp_err
            return False

    def _send_via_brevo(
        self,
        subject: str,
        body: str,
        recipients: List[str],
        html_body: Optional[str] = None,
    ) -> bool:
        """
        Sends email via Brevo transactional email HTTP API.
        Uses Python built-in urllib — no third-party packages required.
        """
        url = "https://api.brevo.com/v3/smtp/email"

        payload = {
            "sender": {
                "name": "Mintana CRM",
                "email": self.from_email,
            },
            "to": [{"email": r} for r in recipients],
            "subject": subject,
            "textContent": body,
        }
        if html_body:
            payload["htmlContent"] = html_body

        data = json.dumps(payload).encode("utf-8")

        req = urllib_request.Request(
            url,
            data=data,
            headers={
                "accept": "application/json",
                "api-key": self.brevo_api_key,
                "content-type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib_request.urlopen(req, timeout=15) as resp:
                status = resp.getcode()
                if status in (200, 201):
                    return True
                body_resp = resp.read().decode("utf-8", errors="replace")
                logger.error(f"[Brevo] Unexpected status {status}: {body_resp}")
                return False
        except HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            logger.error(f"[Brevo] HTTP error {e.code}: {err_body}")
            return False
        except URLError as e:
            logger.error(f"[Brevo] URL error: {e.reason}")
            return False

    def _send_raw_smtp(
        self,
        subject: str,
        body: str,
        recipients: List[str],
        html_body: Optional[str] = None,
    ):
        """
        Direct SMTP dispatch handler using standard library smtplib.
        """
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = self.from_email
        msg['To'] = ", ".join(recipients)

        msg.attach(MIMEText(body, 'plain'))
        if html_body:
            msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(self.host, self.port, timeout=15) as server:
            if self.use_tls:
                server.starttls()
            if self.user and self.password:
                server.login(self.user, self.password)
            server.sendmail(self.from_email, recipients, msg.as_string())
