from supabase.client import create_client
import os
from dotenv import load_dotenv

load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL", "fallback")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "fallback")


supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
