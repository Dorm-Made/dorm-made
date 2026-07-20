from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    STRIPE_SECRET_KEY = os.getenv("STRIPE_KEY")
    STRIPE_CONNECT_WEBHOOK_SECRET = os.getenv("STRIPE_CONNECT_WEBHOOK_SECRET")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")

    @classmethod
    def validate(cls):
        # SECRET_KEY / SUPABASE_URL / SUPABASE_KEY fail hard at import time in
        # utils/password.py and utils/supabase.py; the checks below cover the rest.
        if not cls.STRIPE_SECRET_KEY:
            raise ValueError("STRIPE_KEY not set in environment")
        if not cls.STRIPE_CONNECT_WEBHOOK_SECRET:
            raise ValueError("STRIPE_CONNECT_WEBHOOK_SECRET not set in environment")
        if not cls.STRIPE_WEBHOOK_SECRET:
            raise ValueError("STRIPE_WEBHOOK_SECRET not set in environment")
        if not cls.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY not set in environment")


config = Config()
