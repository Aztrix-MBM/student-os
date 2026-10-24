import pytest
from app.engine.readiness import calculate_readiness, resolve_mastery


def test_readiness_empty_topics():
    """Empty syllabus topics returns 0.0 readiness, 0.0 coverage, and estimate label."""
    res = calculate_readiness([])
    assert res["readiness_pct"] == 0.0
    assert res["coverage_pct"] == 0.0
    assert res["weak_topics"] == []
    assert res["strong_topics"] == []
    assert res["total_topics"] == 0
    assert res["reviewed_topics"] == 0
    assert res["label"] == "estimate"


def test_readiness_all_unreviewed():
    """Topics that have never been reviewed produce 0% coverage and are marked weak."""
    topics = [
        {"id": 1, "title": "Arrays", "importance": 0.8},
        {"id": 2, "title": "Linked Lists", "importance": 0.5},
    ]
    res = calculate_readiness(topics)
    assert res["coverage_pct"] == 0.0
    assert res["readiness_pct"] == 0.0
    assert len(res["weak_topics"]) == 2
    assert len(res["strong_topics"]) == 0


def test_readiness_all_mastered_fresh():
    """All topics rated strong and reviewed today yield ~90% readiness and 100% coverage."""
    topics = [
        {"id": 1, "title": "Trees", "self_level": "strong", "days_since_review": 0, "stability": 4.0},
        {"id": 2, "title": "Graphs", "self_level": "strong", "days_since_review": 0, "stability": 4.0},
    ]
    res = calculate_readiness(topics)
    assert res["coverage_pct"] == 100.0
    assert res["readiness_pct"] == 90.0
    assert len(res["strong_topics"]) == 2
    assert len(res["weak_topics"]) == 0


def test_readiness_decay_impact():
    """Elapsed time decays retention, substantially reducing readiness."""
    fresh_topics = [
        {"id": 1, "title": "DP", "self_level": "strong", "days_since_review": 0, "stability": 2.0}
    ]
    decayed_topics = [
        {"id": 1, "title": "DP", "self_level": "strong", "days_since_review": 14, "stability": 2.0}
    ]
    res_fresh = calculate_readiness(fresh_topics)
    res_decayed = calculate_readiness(decayed_topics)

    assert res_fresh["readiness_pct"] > res_decayed["readiness_pct"]
    assert res_decayed["readiness_pct"] < 5.0
    # Decayed topic should now appear in weak_topics due to low retention
    assert len(res_decayed["weak_topics"]) == 1


def test_readiness_weighted_topics():
    """High importance topic contributes proportionally more to final readiness."""
    # Scenario A: High importance topic mastered (0.9), low importance weak (0.3)
    topics_a = [
        {"id": 1, "title": "Core Unit", "importance": 1.0, "self_level": "strong", "days_since_review": 0},
        {"id": 2, "title": "Minor Note", "importance": 0.1, "self_level": "weak", "days_since_review": 0},
    ]
    # Scenario B: Low importance topic mastered (0.9), high importance weak (0.3)
    topics_b = [
        {"id": 1, "title": "Core Unit", "importance": 1.0, "self_level": "weak", "days_since_review": 0},
        {"id": 2, "title": "Minor Note", "importance": 0.1, "self_level": "strong", "days_since_review": 0},
    ]
    res_a = calculate_readiness(topics_a)
    res_b = calculate_readiness(topics_b)

    assert res_a["readiness_pct"] > res_b["readiness_pct"]


def test_resolve_mastery_quiz_override():
    """Quiz score takes priority over self_level."""
    # 95% on quiz overrides self_level 'weak'
    m = resolve_mastery(self_level="weak", quiz_score=95.0)
    assert m == 0.95
    # 0.85 normalized score
    m2 = resolve_mastery(self_level="strong", quiz_score=0.85)
    assert m2 == 0.85


def test_resolve_mastery_rating_fallback():
    """Rating fallback works when self_level and quiz_score are absent."""
    assert resolve_mastery(latest_rating="easy") == 0.9
    assert resolve_mastery(latest_rating="good") == 0.6
    assert resolve_mastery(latest_rating="hard") == 0.3
    assert resolve_mastery(latest_rating="fail") == 0.1


def test_readiness_label_always_estimate():
    """UI compliance rule: readiness label must always be 'estimate'."""
    res1 = calculate_readiness([])
    res2 = calculate_readiness([{"id": 1, "title": "T1", "self_level": "strong", "days_since_review": 0}])
    assert res1["label"] == "estimate"
    assert res2["label"] == "estimate"


def test_readiness_partial_coverage():
    """Partial coverage accurately reflects reviewed / total topic ratio."""
    topics = [
        {"id": 1, "title": "T1", "days_since_review": 1, "self_level": "okay"},
        {"id": 2, "title": "T2", "days_since_review": None},
        {"id": 3, "title": "T3", "days_since_review": None},
        {"id": 4, "title": "T4", "days_since_review": 2, "self_level": "strong"},
    ]
    res = calculate_readiness(topics)
    assert res["total_topics"] == 4
    assert res["reviewed_topics"] == 2
    assert res["coverage_pct"] == 50.0
