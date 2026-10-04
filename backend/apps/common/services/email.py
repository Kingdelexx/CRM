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
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: Optional[bool] = True,
    ):
        self.host = (
            host
            or os.environ.get('SMTP_HOST')
            or getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        )

        raw_port = (
            port
            or os.environ.get('SMTP_PORT')
            or getattr(settings, 'EMAIL_PORT', 587)
        )
        self.port = int(raw_port)

        self.user = (
            user
            or os.environ.get('SMTP_USER')
            or getattr(settings, 'EMAIL_HOST_USER', '')
        )

        raw_pass = (
            password
            or os.environ.get('SMTP_PASS')
            or getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        )
        self.password = str(raw_pass).replace(' ', '')

        self.use_tls = (
            use_tls
            if use_tls is not None
            else getattr(settings, 'EMAIL_USE_TLS', True)
        )
        self.from_email = (
            getattr(settings, 'DEFAULT_FROM_EMAIL', '')
            or self.user
            or 'noreply@mintana.com'
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
            return False

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=self.from_email,
                recipient_list=clean_recipients,
                html_message=html_body,
                fail_silently=fail_silently,
            )
            logger.info(f"[EmailNotificationService] Sent '{subject}' to {clean_recipients}")
            return True
        except Exception as e:
            logger.error(f"[EmailNotificationService] Failed sending email '{subject}': {e}")
            if not fail_silently:
                try:
                    self._send_raw_smtp(subject, body, clean_recipients, html_body)
                    return True
                except Exception as smtp_err:
                    logger.error(f"[EmailNotificationService] Direct SMTP fallback error: {smtp_err}")
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

        with smtplib.SMTP(self.host, self.port) as server:
            if self.use_tls:
                server.starttls()
            if self.user and self.password:
                server.login(self.user, self.password)
            server.sendmail(self.from_email, recipients, msg.as_string())
