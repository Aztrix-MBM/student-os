"""
Pure functional Soft Streak engine for Student OS.

Architectural Rule:
This module must remain 100% pure with zero imports of SQLAlchemy,
FastAPI, Pydantic, or HTTP libraries.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Set


@dataclass(frozen=True)
class StreakResult:
    current_streak: int
    longest_streak: int
    total_active_days: int
    is_active_today: bool
    grace_days_used: int
    grace_days_remaining: int
    status: str  # 'active', 'at_risk', 'grace_applied', 'broken'
    message: str


def calculate_soft_streak(
    activity_dates: List[date],
    today: date,
    grace_days_allowed: int = 1,
) -> StreakResult:
    """
    Computes a student's Soft Streak.

    Unlike brittle hard streaks that reset to 0 after a single missed day,
    a Soft Streak provides an intelligent grace day buffer to prevent study
    disheartening and app abandonment, while accurately recognizing habit consistency.

    Args:
        activity_dates: List of dates on which the student logged study sessions or topic reviews.
        today: The reference current date (typically today in UTC or student's local timezone).
        grace_days_allowed: Number of allowable missed days before the streak resets (default 1).

    Returns:
        StreakResult with current_streak, longest_streak, status, and motivational message.
    """
    if not activity_dates:
        return StreakResult(
            current_streak=0,
            longest_streak=0,
            total_active_days=0,
            is_active_today=False,
            grace_days_used=0,
            grace_days_remaining=grace_days_allowed,
            status="broken",
            message="Start a new streak today with a quick 10-minute review! 🌱",
        )

    # Filter out future dates and normalize unique sorted days
    valid_dates: Set[date] = {d for d in activity_dates if d <= today}
    if not valid_dates:
        return StreakResult(
            current_streak=0,
            longest_streak=0,
            total_active_days=0,
            is_active_today=False,
            grace_days_used=0,
            grace_days_remaining=grace_days_allowed,
            status="broken",
            message="Start a new streak today with a quick 10-minute review! 🌱",
        )

    total_active_days = len(valid_dates)
    is_active_today = today in valid_dates

    # 1. Calculate Current Active Streak
    current_streak = 0
    grace_days_used = 0
    status = "broken"

    cursor = today
    if is_active_today:
        current_streak = 1
        cursor = today - timedelta(days=1)
        status = "active"
    else:
        yesterday = today - timedelta(days=1)
        if yesterday in valid_dates:
            # Studied yesterday; today is pending
            current_streak = 1
            cursor = yesterday - timedelta(days=1)
            status = "at_risk"
        elif (today - timedelta(days=2)) in valid_dates and grace_days_allowed >= 1:
            # Missed yesterday, studied 2 days ago: Grace day automatically protects yesterday!
            grace_days_used = 1
            current_streak = 1
            cursor = today - timedelta(days=3)
            status = "grace_applied"
        else:
            # No activity yesterday or day before within grace allowance
            current_streak = 0
            status = "broken"

    # Traverse backwards to extend the current streak
    if current_streak > 0:
        while True:
            if cursor in valid_dates:
                current_streak += 1
                cursor -= timedelta(days=1)
            else:
                # Check if there is an active day within remaining grace allowance behind cursor
                remaining_grace = grace_days_allowed - grace_days_used
                if remaining_grace <= 0:
                    break

                found_bridge = False
                for step in range(1, remaining_grace + 1):
                    target_date = cursor - timedelta(days=step)
                    if target_date in valid_dates:
                        # Found active day! Consume 'step' grace days and bridge across
                        grace_days_used += step
                        cursor = target_date
                        found_bridge = True
                        break

                if not found_bridge:
                    # No active date behind to bridge; this is the true start of the streak
                    break

    grace_days_remaining = max(0, grace_days_allowed - grace_days_used)

    # 2. Calculate Historical Longest Streak across all dates
    sorted_dates = sorted(valid_dates)
    longest_streak = 0

    if sorted_dates:
        # Evaluate max streak over historical dates
        temp_streak = 1
        i = 0
        while i < len(sorted_dates):
            current_run = 1
            idx = i
            avail_grace = grace_days_allowed

            while idx + 1 < len(sorted_dates):
                gap = (sorted_dates[idx + 1] - sorted_dates[idx]).days
                if gap == 1:
                    current_run += 1
                    idx += 1
                elif gap - 1 <= avail_grace:
                    avail_grace -= (gap - 1)
                    current_run += 1
                    idx += 1
                else:
                    break

            if current_run > longest_streak:
                longest_streak = current_run
            i += 1

    longest_streak = max(longest_streak, current_streak)

    # 3. Formulate human-readable motivational message
    if is_active_today:
        if current_streak >= 14:
            message = f"🔥 Master of consistency! {current_streak}-day streak going strong!"
        elif current_streak >= 7:
            message = f"🔥 {current_streak}-Day Streak! Unstoppable momentum!"
        elif current_streak > 1:
            message = f"🔥 {current_streak}-Day Streak! Great job studying today!"
        else:
            message = "🔥 1-Day Streak! Great start, keep the momentum going tomorrow!"
    elif status == "at_risk":
        message = f"⚡ Complete 1 session today to protect your {current_streak}-day streak!"
    elif status == "grace_applied":
        message = f"🛡️ Grace day protected your {current_streak}-day streak! Study today to keep it."
    else:
        message = "🌱 Start a fresh streak today with a quick 10-minute review!"

    return StreakResult(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_active_days=total_active_days,
        is_active_today=is_active_today,
        grace_days_used=grace_days_used,
        grace_days_remaining=grace_days_remaining,
        status=status,
        message=message,
    )
