"""Add rating system (event_reviews, guest_reviews)

Revision ID: a1f4e8b2c9d0
Revises: dd30e19648a3
Create Date: 2026-07-08 03:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a1f4e8b2c9d0"
down_revision: Union[str, Sequence[str], None] = "dd30e19648a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "event_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("host_user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("food_stars", sa.Integer(), nullable=False),
        sa.Column("space_stars", sa.Integer(), nullable=False),
        sa.Column("host_stars", sa.Integer(), nullable=False),
        sa.Column("food_comment", sa.Text(), nullable=True),
        sa.Column("space_comment", sa.Text(), nullable=True),
        sa.Column("host_comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["host_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "reviewer_id", name="uq_event_review_once"),
        sa.CheckConstraint("food_stars BETWEEN 1 AND 5", name="valid_food_stars"),
        sa.CheckConstraint("space_stars BETWEEN 1 AND 5", name="valid_space_stars"),
        sa.CheckConstraint("host_stars BETWEEN 1 AND 5", name="valid_host_stars"),
    )
    op.create_index(
        op.f("ix_event_reviews_event_id"), "event_reviews", ["event_id"], unique=False
    )
    op.create_index(
        op.f("ix_event_reviews_reviewer_id"),
        "event_reviews",
        ["reviewer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_reviews_host_user_id"),
        "event_reviews",
        ["host_user_id"],
        unique=False,
    )

    op.create_table(
        "guest_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("host_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("guest_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("sociability_stars", sa.Integer(), nullable=False),
        sa.Column("etiquette_stars", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["host_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["guest_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "guest_id", name="uq_guest_review_once"),
        sa.CheckConstraint(
            "sociability_stars BETWEEN 1 AND 5", name="valid_sociability_stars"
        ),
        sa.CheckConstraint(
            "etiquette_stars BETWEEN 1 AND 5", name="valid_etiquette_stars"
        ),
    )
    op.create_index(
        op.f("ix_guest_reviews_event_id"), "guest_reviews", ["event_id"], unique=False
    )
    op.create_index(
        op.f("ix_guest_reviews_host_id"), "guest_reviews", ["host_id"], unique=False
    )
    op.create_index(
        op.f("ix_guest_reviews_guest_id"), "guest_reviews", ["guest_id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_guest_reviews_guest_id"), table_name="guest_reviews")
    op.drop_index(op.f("ix_guest_reviews_host_id"), table_name="guest_reviews")
    op.drop_index(op.f("ix_guest_reviews_event_id"), table_name="guest_reviews")
    op.drop_table("guest_reviews")
    op.drop_index(op.f("ix_event_reviews_host_user_id"), table_name="event_reviews")
    op.drop_index(op.f("ix_event_reviews_reviewer_id"), table_name="event_reviews")
    op.drop_index(op.f("ix_event_reviews_event_id"), table_name="event_reviews")
    op.drop_table("event_reviews")
