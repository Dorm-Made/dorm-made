"""Add referral system and taste profile columns to users

Revision ID: b7c3d1e5f2a8
Revises: a1f4e8b2c9d0
Create Date: 2026-07-08 05:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b7c3d1e5f2a8"
down_revision: Union[str, Sequence[str], None] = "a1f4e8b2c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Referral system
    op.add_column("users", sa.Column("invite_code", sa.String(), nullable=True))
    op.create_index(
        op.f("ix_users_invite_code"), "users", ["invite_code"], unique=True
    )
    op.add_column(
        "users",
        sa.Column("referred_by_user_id", postgresql.UUID(as_uuid=False), nullable=True),
    )
    op.create_index(
        op.f("ix_users_referred_by_user_id"),
        "users",
        ["referred_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_users_referred_by_user_id_users",
        "users",
        "users",
        ["referred_by_user_id"],
        ["id"],
    )

    # Taste profile (onboarding quiz)
    op.add_column("users", sa.Column("taste_archetype", sa.String(), nullable=True))
    op.add_column("users", sa.Column("taste_description", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("taste_picks", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "onboarding_completed")
    op.drop_column("users", "taste_picks")
    op.drop_column("users", "taste_description")
    op.drop_column("users", "taste_archetype")
    op.drop_constraint("fk_users_referred_by_user_id_users", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_referred_by_user_id"), table_name="users")
    op.drop_column("users", "referred_by_user_id")
    op.drop_index(op.f("ix_users_invite_code"), table_name="users")
    op.drop_column("users", "invite_code")
