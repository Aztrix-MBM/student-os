import math
from typing import Literal

INITIAL_STABILITY: float = 2.0  # in days


def retention(days_since_review: float, stability: float) -> float:
    """
    Computes memory retention probability using the Ebbinghaus exponential decay model:
    R(t, S) = exp(-t / S)

    :param days_since_review: Elapsed days since the topic was reviewed (t >= 0).
    :param stability: Memory stability factor in days (S > 0).
    :return: Probability of retention in range [0.0, 1.0].
    """
    if days_since_review <= 0.0:
        return 1.0
    if stability <= 0.0:
        stability = 1e-6

    decay = -days_since_review / stability
    # Prevent extreme math underflow for large decay values
    if decay < -700.0:
        return 0.0

    return max(0.0, min(1.0, math.exp(decay)))


def update_stability(
    stability: float,
    rating: Literal["easy", "good", "hard", "fail"] | str,
) -> float:
    """
    Updates the memory stability duration based on spaced repetition review rating:
    - easy: * 2.5
    - good: * 2.0
    - hard: * 1.3
    - fail: max(1.0, stability * 0.5)

    :param stability: Previous stability in days.
    :param rating: Review rating result.
    :return: New stability in days (at least 1.0 day).
    """
    norm_rating = rating.strip().lower() if isinstance(rating, str) else "good"
    curr_stability = max(1.0, stability)

    if norm_rating == "easy":
        return round(curr_stability * 2.5, 2)
    elif norm_rating == "good":
        return round(curr_stability * 2.0, 2)
    elif norm_rating == "hard":
        return round(curr_stability * 1.3, 2)
    elif norm_rating == "fail":
        return max(1.0, round(curr_stability * 0.5, 2))
    else:
        # Default fallback to good
        return round(curr_stability * 2.0, 2)


def is_review_due(days: float, stability: float, threshold: float = 0.7) -> bool:
    """
    Checks if a topic review is due based on whether retention has decayed below threshold.

    :param days: Days since last review.
    :param stability: Current stability in days.
    :param threshold: Retention cut-off (default 0.7 / 70%).
    :return: True if retention < threshold, else False.
    """
    r = retention(days, stability)
    return r < threshold
