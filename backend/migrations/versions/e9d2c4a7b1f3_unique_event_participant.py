"""Add unique constraint on (event_id, participant_id) to events_participants

Dedupes any existing duplicate rows first (keeps the most relevant row per
pair: confirmed > booked > cancelled, then most recent), then enforces
uniqueness so Stripe webhook retries can never double-book a foodie.

Revision ID: e9d2c4a7b1f3
Revises: b7c3d1e5f2a8
Create Date: 2026-07-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e9d2c4a7b1f3"
down_revision: Union[str, Sequence[str], None] = "b7c3d1e5f2a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove duplicates, keeping the best row per (event_id, participant_id):
    # status priority confirmed > booked > cancelled, tie-break newest joined_at.
    op.execute(
        """
        DELETE FROM events_participants
        WHERE id NOT IN (
            SELECT DISTINCT ON (event_id, participant_id) id
            FROM events_participants
            ORDER BY event_id, participant_id,
                CASE status
                    WHEN 'confirmed' THEN 0
                    WHEN 'booked' THEN 1
                    ELSE 2
                END,
                joined_at DESC
        )
        """
    )
    op.create_unique_constraint(
        "uq_event_participant", "events_participants", ["event_id", "participant_id"]
    )
    # Track when the host confirmed the seat (refund policy runs off this,
    # not off joined_at). Backfill existing confirmed rows with joined_at.
    op.add_column(
        "events_participants",
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE events_participants SET confirmed_at = joined_at WHERE status = 'confirmed'"
    )


def downgrade() -> None:
    op.drop_column("events_participants", "confirmed_at")
    op.drop_constraint("uq_event_participant", "events_participants", type_="unique")
