from datetime import date, timedelta
from app.engine.streak import calculate_soft_streak


def test_streak_empty_activity():
    today = date(2026, 10, 25)
    res = calculate_soft_streak([], today)
    assert res.current_streak == 0
    assert res.longest_streak == 0
    assert res.total_active_days == 0
    assert res.is_active_today is False
    assert res.status == "broken"
    assert "Start a new streak" in res.message


def test_streak_today_only():
    today = date(2026, 10, 25)
    res = calculate_soft_streak([today], today)
    assert res.current_streak == 1
    assert res.longest_streak == 1
    assert res.total_active_days == 1
    assert res.is_active_today is True
    assert res.status == "active"
    assert res.grace_days_used == 0
    assert "1-Day Streak" in res.message


def test_streak_yesterday_only():
    today = date(2026, 10, 25)
    yesterday = today - timedelta(days=1)
    res = calculate_soft_streak([yesterday], today)
    assert res.current_streak == 1
    assert res.longest_streak == 1
    assert res.is_active_today is False
    assert res.status == "at_risk"
    assert "protect your 1-day streak" in res.message


def test_streak_consecutive_days_with_today():
    today = date(2026, 10, 25)
    dates = [today - timedelta(days=i) for i in range(5)]
    res = calculate_soft_streak(dates, today)
    assert res.current_streak == 5
    assert res.longest_streak == 5
    assert res.total_active_days == 5
    assert res.is_active_today is True
    assert res.status == "active"
    assert res.grace_days_used == 0


def test_streak_one_day_grace_bridge():
    today = date(2026, 10, 25)
    # Studied today and 2 days ago (yesterday was missed)
    dates = [today, today - timedelta(days=2)]
    res = calculate_soft_streak(dates, today, grace_days_allowed=1)
    assert res.current_streak == 2
    assert res.is_active_today is True
    assert res.grace_days_used == 1
    assert res.grace_days_remaining == 0
    assert res.status == "active"


def test_streak_grace_applied_when_not_yet_studied_today():
    today = date(2026, 10, 25)
    # Studied 2 days ago, missed yesterday, has not studied yet today
    two_days_ago = today - timedelta(days=2)
    res = calculate_soft_streak([two_days_ago], today, grace_days_allowed=1)
    assert res.current_streak == 1
    assert res.is_active_today is False
    assert res.status == "grace_applied"
    assert res.grace_days_used == 1
    assert "Grace day protected" in res.message


def test_streak_two_consecutive_misses_breaks_streak():
    today = date(2026, 10, 25)
    # Studied 3 days ago, missed 2 days in a row (yesterday and 2 days ago)
    three_days_ago = today - timedelta(days=3)
    res = calculate_soft_streak([three_days_ago], today, grace_days_allowed=1)
    assert res.current_streak == 0
    assert res.is_active_today is False
    assert res.status == "broken"


def test_streak_duplicate_activity_on_same_day():
    today = date(2026, 10, 25)
    yesterday = today - timedelta(days=1)
    # 5 sessions today and 3 sessions yesterday
    dates = [today] * 5 + [yesterday] * 3
    res = calculate_soft_streak(dates, today)
    assert res.total_active_days == 2
    assert res.current_streak == 2
    assert res.longest_streak == 2


def test_streak_historical_longest_preserved():
    today = date(2026, 10, 25)
    # 7-day streak 30 days ago
    past_dates = [today - timedelta(days=30 + i) for i in range(7)]
    # Currently 2-day streak (yesterday and today)
    current_dates = [today, today - timedelta(days=1)]
    res = calculate_soft_streak(past_dates + current_dates, today)
    assert res.current_streak == 2
    assert res.longest_streak == 7
    assert res.total_active_days == 9


def test_streak_future_dates_ignored():
    today = date(2026, 10, 25)
    future = today + timedelta(days=5)
    res = calculate_soft_streak([future], today)
    assert res.current_streak == 0
    assert res.total_active_days == 0
    assert res.status == "broken"
