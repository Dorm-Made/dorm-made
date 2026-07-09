"""Onboarding taste quiz: 8 image pairs -> signal scoring -> taste profile.

Each image carries a primary signal (2 points) and a secondary signal (1 point).
The top-scoring signals drive a rule-based archetype + a 2-4 sentence
description that reads as personalized ("you clicked all the red meat,
so we know you're a carnivore").
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
import json
import logging

from models.user import UserModel
from schemas.user import TasteProfileResponse

logger = logging.getLogger(__name__)

_IMG = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=800&q=70"


def _image(image_id, label, unsplash_id, emoji, primary, secondary):
    return {
        "id": image_id,
        "label": label,
        "image_url": _IMG.format(id=unsplash_id),
        "emoji": emoji,  # frontend fallback if the photo fails to load
        "primary": primary,
        "secondary": secondary,
    }


# 8 questions x 2 options. Options are intentionally contrasting but not
# strictly opposite, so every click leaks a taste signal.
QUIZ_QUESTIONS: List[Dict] = [
    {
        "id": "q1",
        "prompt": "First things first — pick your protein",
        "options": [
            _image("steak", "Juicy steak", "1600891964092-4316c288032e", "🥩", "red_meat", "protein"),
            _image("chicken", "Grilled chicken", "1532550907401-a500c9a57435", "🍗", "poultry", "fresh_healthy"),
        ],
    },
    {
        "id": "q2",
        "prompt": "Build your base",
        "options": [
            _image("pasta", "Creamy pasta", "1621996346565-e3dbc646d9a9", "🍝", "carbs", "comfort"),
            _image("veggie_bowl", "Garden veggie bowl", "1512621776951-a57141f2eefd", "🥗", "plant_based", "fresh_healthy"),
        ],
    },
    {
        "id": "q3",
        "prompt": "Heat check",
        "options": [
            _image("ramen", "Spicy ramen", "1569718212165-3a8278d5f624", "🍜", "spicy", "adventurous"),
            _image("mac_cheese", "Mac & cheese", "1543339494-b4cd4f7ba686", "🧀", "comfort", "carbs"),
        ],
    },
    {
        "id": "q4",
        "prompt": "Friday night craving",
        "options": [
            _image("sushi", "Fresh sushi", "1579871494447-9811cf80d66c", "🍣", "seafood", "adventurous"),
            _image("burger", "Smash burger", "1568901346375-23c9450c58cd", "🍔", "comfort", "red_meat"),
        ],
    },
    {
        "id": "q5",
        "prompt": "Sharing with friends",
        "options": [
            _image("tacos", "Street tacos", "1551504734-5ee1c4a1479b", "🌮", "spicy", "social"),
            _image("pizza", "Wood-fired pizza", "1565299624946-b28f40a0ae38", "🍕", "carbs", "social"),
        ],
    },
    {
        "id": "q6",
        "prompt": "Weekend feast centerpiece",
        "options": [
            _image("ribs", "BBQ ribs", "1544025162-d76694265947", "🍖", "red_meat", "social"),
            _image("paella", "Seafood paella", "1534080564583-6be75777b70a", "🥘", "seafood", "social"),
        ],
    },
    {
        "id": "q7",
        "prompt": "And for the finale...",
        "options": [
            _image("chocolate", "Chocolate dessert", "1563805042-7684c019e1cb", "🍫", "sweet", "comfort"),
            _image("acai", "Açaí fruit bowl", "1590301157890-4810ed352733", "🍓", "fresh_healthy", "sweet"),
        ],
    },
    {
        "id": "q8",
        "prompt": "Your ideal dinner scene",
        "options": [
            _image("feast", "Family-style feast", "1504674900247-0877df9cc836", "🍽️", "social", "adventurous"),
            _image("fine_dining", "Fine-dining plate", "1414235077428-338989a2e8c0", "✨", "gourmet", "adventurous"),
        ],
    },
]

# image id -> (primary, secondary)
_IMAGE_SIGNALS: Dict[str, Dict] = {
    option["id"]: option for question in QUIZ_QUESTIONS for option in question["options"]
}

_ARCHETYPES: Dict[str, str] = {
    "red_meat": "The Bold Carnivore",
    "protein": "The Protein Powerhouse",
    "poultry": "The Lean Machine",
    "seafood": "The Ocean Explorer",
    "plant_based": "The Green Gourmet",
    "fresh_healthy": "The Fresh Fanatic",
    "spicy": "The Spice Seeker",
    "comfort": "The Comfort Connoisseur",
    "carbs": "The Carb Craver",
    "sweet": "The Sweet Soul",
    "adventurous": "The Global Adventurer",
    "social": "The Social Feaster",
    "gourmet": "The Refined Palate",
}

_OPENERS: Dict[str, str] = {
    "red_meat": "You're a true carnivore at heart — hearty, protein-dense plates are your happy place.",
    "protein": "You eat with purpose — protein-packed meals that actually fuel you win almost every round.",
    "poultry": "Lean and clean: you reach for well-seasoned poultry and food that fuels without weighing you down.",
    "seafood": "The ocean calls — you consistently pick fresh seafood and bright, briny flavors.",
    "plant_based": "Plants first! Your picks lean green, colorful, and vegetable-forward.",
    "fresh_healthy": "Fresh is your default — crisp, light, feel-good food wins your vote nearly every time.",
    "spicy": "You like it hot — real heat and punchy seasoning are what make a meal memorable for you.",
    "comfort": "You're all about comfort — rich, cozy, soul-warming classics are your go-to.",
    "carbs": "Carbs are your love language — pasta, bread, and hearty bases anchor your perfect plate.",
    "sweet": "You've got a sweet soul — no meal feels complete without a proper dessert finale.",
    "adventurous": "You're a flavor explorer — bold, global, unfamiliar dishes get your click every single time.",
    "social": "For you, food is about the table, not just the plate — shared, family-style meals are your thing.",
    "gourmet": "You have a refined palate — thoughtful, elevated plates catch your eye over anything rustic.",
}

_SECONDARY_PHRASES: Dict[str, str] = {
    "red_meat": "a juicy cut of red meat",
    "protein": "protein-heavy plates",
    "poultry": "lean, well-seasoned poultry",
    "seafood": "fresh flavors from the sea",
    "plant_based": "vibrant plant-forward dishes",
    "fresh_healthy": "fresh, feel-good ingredients",
    "spicy": "dishes that bring the heat",
    "comfort": "warm comfort-food classics",
    "carbs": "hearty, satisfying carbs",
    "sweet": "a proper dessert moment",
    "adventurous": "bold flavors from around the world",
    "social": "meals made for sharing",
    "gourmet": "refined, chef-level plating",
}


def get_quiz_questions() -> List[Dict]:
    """Quiz definition for the frontend (prompts, images, no signals leaked)."""
    return [
        {
            "id": question["id"],
            "prompt": question["prompt"],
            "options": [
                {
                    "id": option["id"],
                    "label": option["label"],
                    "imageUrl": option["image_url"],
                    "emoji": option["emoji"],
                }
                for option in question["options"]
            ],
        }
        for question in QUIZ_QUESTIONS
    ]


def _score_picks(picks: List[str]) -> List[str]:
    """Return signals ranked by score (primary pick = 2 pts, secondary = 1 pt)."""
    scores: Dict[str, int] = {}
    for image_id in picks:
        option = _IMAGE_SIGNALS[image_id]
        scores[option["primary"]] = scores.get(option["primary"], 0) + 2
        scores[option["secondary"]] = scores.get(option["secondary"], 0) + 1
    return [signal for signal, _ in sorted(scores.items(), key=lambda kv: -kv[1])]


def _build_description(ranked_signals: List[str]) -> str:
    top = ranked_signals[0]
    sentences = [_OPENERS[top]]
    if len(ranked_signals) > 1:
        sentences.append(
            f"You also have a clear soft spot for {_SECONDARY_PHRASES[ranked_signals[1]]}."
        )
    top_three = ranked_signals[:3]
    if "social" in top_three and top != "social":
        sentences.append(
            "Around the table, you're happiest when the food is shared and the conversation keeps flowing."
        )
    elif "adventurous" in top_three and top != "adventurous":
        sentences.append("And you'll happily be the first at the table to try something new.")
    elif "comfort" in top_three and top != "comfort":
        sentences.append("At the end of the day, the best meals feel like home — seconds strongly encouraged.")
    else:
        sentences.append("In short: you know exactly what you like — and it shows in every pick.")
    return " ".join(sentences)


async def submit_quiz(user_id: str, picks: List[str], db: Session) -> TasteProfileResponse:
    """Validate picks, compute the taste profile, and store it on the user."""
    if not picks or len(picks) != len(QUIZ_QUESTIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Please answer all {len(QUIZ_QUESTIONS)} questions",
        )
    valid_ids_per_question = [
        {option["id"] for option in question["options"]} for question in QUIZ_QUESTIONS
    ]
    for index, image_id in enumerate(picks):
        if image_id not in valid_ids_per_question[index]:
            raise HTTPException(status_code=400, detail=f"Invalid pick: {image_id}")

    user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")

    ranked = _score_picks(picks)
    archetype = _ARCHETYPES[ranked[0]]
    description = _build_description(ranked)

    try:
        user_model.taste_archetype = archetype
        user_model.taste_description = description
        user_model.taste_picks = json.dumps(picks)
        user_model.onboarding_completed = True
        db.commit()
        db.refresh(user_model)
        logger.info(f"Taste profile saved for user {user_id}: {archetype}")
        return TasteProfileResponse(
            taste_archetype=archetype,
            taste_description=description,
            onboarding_completed=True,
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving taste profile for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Error saving taste profile")
