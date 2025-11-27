"""
Database initialization script
Creates all tables defined in SQLAlchemy models
"""

from utils.database import engine, Base

from models.user import UserModel
from models.event import EventModel
from models.event_participant import EventParticipantModel
from models.meal import MealModel


def init_database():
    """Create all tables in the database"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

    # Print created tables
    print("\nCreated tables:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")


if __name__ == "__main__":
    init_database()
