from typing import List, Dict, Any, Optional
from app.engine.retention import retention

MASTERY_LEVELS: Dict[str, float] = {
    "strong": 0.9,
    "okay": 0.6,
    "weak": 0.3,
    "none": 0.0,
}

RATING_MASTERY_FALLBACK: Dict[str, float] = {
    "easy": 0.9,
    "good": 0.6,
    "hard": 0.3,
    "fail": 0.1,
}


def resolve_mastery(
    self_level: Optional[str] = None,
    quiz_score: Optional[float] = None,
    latest_rating: Optional[str] = None,
) -> float:
    """
    Resolves mastery factor in range [0.0, 1.0].
    Priority order:
    1. Quiz score if provided (normalized to 0..1).
    2. Self-reported level (strong=0.9, okay=0.6, weak=0.3, none=0.0).
    3. Latest review rating fallback (easy=0.9, good=0.6, hard=0.3, fail=0.1).
    4. Default 0.0 (no review or mastery recorded yet).
    """
    if quiz_score is not None:
        # If score given as percentage (0-100), convert to 0-1
        norm_score = quiz_score / 100.0 if quiz_score > 1.0 else quiz_score
        return max(0.0, min(1.0, float(norm_score)))

    if self_level:
        norm_level = self_level.strip().lower()
        if norm_level in MASTERY_LEVELS:
            return MASTERY_LEVELS[norm_level]

    if latest_rating:
        norm_rating = latest_rating.strip().lower()
        if norm_rating in RATING_MASTERY_FALLBACK:
            return RATING_MASTERY_FALLBACK[norm_rating]

    return 0.0


def calculate_readiness(
    topics: List[Dict[str, Any]],
    exam_weight: float = 1.0,
) -> Dict[str, Any]:
    """
    Computes exam readiness and syllabus coverage based on topics:
    - topic_weight = importance * (exam_weight or 1.0)
    - mastery = resolve_mastery(self_level, quiz_score, latest_rating)
    - retention_val = retention(days_since_review, stability)
    - readiness = Σ(topic_weight * mastery * retention) / Σ(topic_weight)
    - coverage  = topics_with_at_least_1_review / total_topics

    :param topics: List of topic dictionaries.
    :param exam_weight: Multiplier weight for the exam (default 1.0).
    :return: Dict containing readiness_pct, coverage_pct, weak_topics, strong_topics, label="estimate".
    """
    if not topics:
        return {
            "readiness_pct": 0.0,
            "coverage_pct": 0.0,
            "weak_topics": [],
            "strong_topics": [],
            "total_topics": 0,
            "reviewed_topics": 0,
            "label": "estimate",
        }

    total_topics = len(topics)
    reviewed_topics_count = 0
    total_weighted_score = 0.0
    total_weight = 0.0

    weak_topics: List[Dict[str, Any]] = []
    strong_topics: List[Dict[str, Any]] = []

    effective_exam_weight = max(0.1, exam_weight) if exam_weight > 0 else 1.0

    for topic in topics:
        topic_id = topic.get("id")
        title = topic.get("title") or topic.get("name") or f"Topic {topic_id or 'Unknown'}"
        raw_importance = topic.get("importance", 0.5)
        importance = max(0.1, min(1.0, float(raw_importance))) if raw_importance is not None else 0.5

        custom_topic_weight = topic.get("topic_weight")
        if custom_topic_weight is not None and float(custom_topic_weight) > 0:
            weight = float(custom_topic_weight)
        else:
            weight = importance * effective_exam_weight

        # Check review status
        days_since_review = topic.get("days_since_review")
        review_count = topic.get("review_count", 0)
        has_been_reviewed = (days_since_review is not None and days_since_review >= 0) or (review_count > 0)

        if has_been_reviewed:
            reviewed_topics_count += 1
            stability = float(topic.get("stability", 2.0))
            days = max(0.0, float(days_since_review)) if days_since_review is not None else 0.0
            r_val = retention(days, stability)
        else:
            r_val = 0.0

        mastery = resolve_mastery(
            self_level=topic.get("self_level"),
            quiz_score=topic.get("quiz_score"),
            latest_rating=topic.get("latest_rating") or topic.get("rating"),
        )

        effective_topic_score = mastery * r_val
        total_weighted_score += weight * effective_topic_score
        total_weight += weight

        topic_summary = {
            "id": topic_id,
            "title": title,
            "importance": round(importance, 2),
            "mastery": round(mastery, 2),
            "retention": round(r_val, 2),
            "effective_score": round(effective_topic_score, 2),
        }

        # Classify weak vs strong
        # Weak: never reviewed, mastery <= 0.3, or retention decayed below 0.4
        if not has_been_reviewed or mastery <= 0.3 or (has_been_reviewed and r_val < 0.4):
            weak_topics.append(topic_summary)
        elif effective_topic_score >= 0.6:
            strong_topics.append(topic_summary)

    readiness = (total_weighted_score / total_weight) if total_weight > 0 else 0.0
    readiness_pct = round(max(0.0, min(100.0, readiness * 100.0)), 1)
    coverage_pct = round((reviewed_topics_count / total_topics) * 100.0, 1)

    # Sort weak topics: most important first, then lowest effective score
    weak_topics.sort(key=lambda x: (-x["importance"], x["effective_score"]))
    strong_topics.sort(key=lambda x: -x["effective_score"])

    return {
        "readiness_pct": readiness_pct,
        "coverage_pct": coverage_pct,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "total_topics": total_topics,
        "reviewed_topics": reviewed_topics_count,
        "label": "estimate",
    }
