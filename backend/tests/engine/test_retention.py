import math
import pytest
from app.engine.retention import retention, update_stability, is_review_due, INITIAL_STABILITY


def test_retention_day_zero():
    """Topic reviewed today (0 elapsed days) must have 1.0 retention."""
    assert retention(0.0, 2.0) == 1.0
    assert retention(0.0, 10.0) == 1.0


def test_retention_negative_days():
    """Negative days input should be treated as freshly reviewed (1.0)."""
    assert retention(-1.0, 2.0) == 1.0
    assert retention(-10.5, 5.0) == 1.0


def test_retention_at_stability_threshold():
    """At t == S, retention should be e^(-1) ≈ 0.367879."""
    val = retention(2.0, 2.0)
    assert pytest.approx(val, rel=1e-3) == math.exp(-1)
    val2 = retention(7.0, 7.0)
    assert pytest.approx(val2, rel=1e-3) == math.exp(-1)


def test_retention_monotonic_decay():
    """Retention must strictly decrease as elapsed days increase."""
    stability = 4.0
    r1 = retention(1.0, stability)
    r2 = retention(3.0, stability)
    r3 = retention(7.0, stability)
    r4 = retention(14.0, stability)
    assert 1.0 > r1 > r2 > r3 > r4 >= 0.0


def test_update_stability_easy():
    """Rating 'easy' multiplies stability by 2.5."""
    assert update_stability(2.0, "easy") == 5.0
    assert update_stability(4.0, "EASY") == 10.0


def test_update_stability_good():
    """Rating 'good' multiplies stability by 2.0."""
    assert update_stability(2.0, "good") == 4.0
    assert update_stability(3.5, "Good") == 7.0


def test_update_stability_hard():
    """Rating 'hard' multiplies stability by 1.3."""
    assert update_stability(2.0, "hard") == 2.6
    assert update_stability(10.0, "hard") == 13.0


def test_update_stability_fail_floor():
    """Rating 'fail' halves stability but never falls below 1.0 day floor."""
    assert update_stability(4.0, "fail") == 2.0
    assert update_stability(1.5, "fail") == 1.0
    assert update_stability(0.8, "fail") == 1.0


def test_is_review_due():
    """Review due returns True when retention < threshold (default 0.7)."""
    # At t=0, retention=1.0 -> False
    assert is_review_due(0.0, 5.0) is False
    # At t=1, stability=2.0 -> retention = exp(-0.5) ≈ 0.606 < 0.7 -> True
    assert is_review_due(1.0, 2.0) is True
    # Custom threshold test
    assert is_review_due(1.0, 2.0, threshold=0.5) is False


def test_extreme_decay_no_overflow():
    """Extreme elapsed time should return 0.0 cleanly without math error."""
    assert retention(10000.0, 1.0) == 0.0
    assert retention(100.0, 0.0) == 0.0
    assert INITIAL_STABILITY == 2.0
