import base64
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


async def send_calendar_invite(
    to_email: str,
    event_title: str,
    event_when: str,
    event_location: str,
    ics_content: str,
):
    """Email the foodie a calendar invite (.ics attached) for a booked event.

    Works with Apple Calendar, Google Calendar and Outlook. The .ics content
    is base64-encoded for the Resend attachment API.
    """
    ics_b64 = base64.b64encode(ics_content.encode("utf-8")).decode("ascii")

    html = f"""
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #e11d2a;">You're booked! 🎉</h2>
        <p>Your seat at <strong>{event_title}</strong> is reserved.</p>
        <p style="margin: 4px 0;">🗓️ {event_when}</p>
        <p style="margin: 4px 0;">📍 {event_location}</p>
        <p style="margin-top: 16px;">
          The calendar invite is attached - open it to add this dinner to your calendar.
          If your event is linked to a recipe, the ingredients list is inside the invite details.
        </p>
        <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">See you at the table,<br/>The Dorm Made team</p>
      </div>
    """

    resend.Emails.send(
        {
            "from": "updates@dormmade.com",
            "to": to_email,
            "subject": f"Your seat is booked: {event_title}",
            "html": html,
            "attachments": [
                {
                    "filename": "dormmade-event.ics",
                    "content": ics_b64,
                    "content_type": "text/calendar",
                }
            ],
        }
    )
