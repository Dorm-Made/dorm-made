import resend
from utils.config import config

resend.api_key = config.RESEND_API_KEY


async def send_chef_notification(chef_email: str, event_name: str):
    resend.Emails.send(
        {
            "from": "updates@dormmade.com",
            "to": chef_email,
            "template": {
                "id": "chef_alert",
                "variables": {
                    "event_name": event_name,
                },
            },
        }
    )
