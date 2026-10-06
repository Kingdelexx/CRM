import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class EmailNotificationService:
    """
    Modular Email Notification Service that connects to an SMTP host
    using environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
    Uses dynamic properties so settings updates are always picked up immediately.
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

    def send_email(
        self,
        subject: str,
        body: str,
        recipients: List[str],
        html_body: Optional[str] = None,
        fail_silently: bool = False,
    ) -> bool:
        """
        Sends an email to the specified list of recipient emails.
        Leverages Django's mail interface, with direct SMTP fallback if needed.
        """
        if not recipients:
            logger.warning("[EmailNotificationService] No recipients provided.")
            return False

        clean_recipients = [r.strip() for r in recipients if r and r.strip()]
        if not clean_recipients:
            logger.warning("[EmailNotificationService] Recipient list is empty after cleaning.")
            return False

        # Attempt 1: Standard Django send_mail dispatch
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
                logger.info(f"[EmailNotificationService] Sent '{subject}' to {clean_recipients}")
                return True
            else:
                logger.warning(f"[EmailNotificationService] send_mail returned 0 for '{subject}'. Trying direct SMTP fallback.")
        except Exception as e:
            logger.error(f"[EmailNotificationService] Primary send_mail failed for '{subject}': {e}. Triggering direct SMTP fallback...")

        # Attempt 2: Direct SMTP Fallback
        try:
            self._send_raw_smtp(subject, body, clean_recipients, html_body)
            logger.info(f"[EmailNotificationService] Direct SMTP fallback succeeded for '{subject}' to {clean_recipients}")
            return True
        except Exception as smtp_err:
            logger.error(f"[EmailNotificationService] Direct SMTP fallback error for '{subject}': {smtp_err}")
            if not fail_silently:
                raise smtp_err
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
