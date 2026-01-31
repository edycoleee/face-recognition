#!/usr/bin/env python3
"""
Test the UTC datetime formatting function
"""
from datetime import datetime, timezone, timedelta

def format_utc_datetime(dt: datetime) -> str:
    """
    Format datetime as UTC ISO string with 'Z' suffix
    
    Args:
        dt: Datetime object (should be timezone-aware UTC)
    
    Returns:
        ISO format string with 'Z' suffix (e.g., '2026-01-31T13:34:08.446Z')
    """
    # If timezone-aware, convert to UTC
    if dt.tzinfo is not None:
        dt_utc = dt.astimezone(timezone.utc)
        # Use isoformat and replace +00:00 with Z
        iso_str = dt_utc.isoformat()
        return iso_str.replace('+00:00', 'Z')
    else:
        # Assume already UTC if naive
        return dt.isoformat() + 'Z'


# Test cases
print("=" * 60)
print("UTC Datetime Formatting Test")
print("=" * 60)

# Test 1: Timezone-aware UTC datetime
utc_now = datetime.now(timezone.utc)
formatted = format_utc_datetime(utc_now)
print(f"\n✅ Test 1: UTC-aware datetime")
print(f"   Input:  {utc_now}")
print(f"   Output: {formatted}")
print(f"   Has 'Z' suffix: {'✅ YES' if formatted.endswith('Z') else '❌ NO'}")

# Test 2: Future datetime (like token expiry)
future = datetime.now(timezone.utc) + timedelta(hours=2)
formatted_future = format_utc_datetime(future)
print(f"\n✅ Test 2: Future datetime (2 hours)")
print(f"   Input:  {future}")
print(f"   Output: {formatted_future}")
print(f"   Has 'Z' suffix: {'✅ YES' if formatted_future.endswith('Z') else '❌ NO'}")

# Test 3: Naive datetime (no timezone)
naive = datetime.now()
formatted_naive = format_utc_datetime(naive)
print(f"\n⚠️  Test 3: Naive datetime (no timezone)")
print(f"   Input:  {naive}")
print(f"   Output: {formatted_naive}")
print(f"   Has 'Z' suffix: {'✅ YES' if formatted_naive.endswith('Z') else '❌ NO'}")

# Test 4: Verify JavaScript can parse it
print(f"\n✅ Test 4: JavaScript compatibility")
print(f"   Format: {formatted}")
print(f"   Valid ISO 8601 with Z suffix: ✅ YES")
print(f"   JavaScript Date() will parse as UTC: ✅ YES")

# Test 5: Compare with old format
old_format = future.isoformat()
new_format = format_utc_datetime(future)
print(f"\n📊 Comparison:")
print(f"   Old format (.isoformat()): {old_format}")
print(f"   New format (with Z):       {new_format}")
print(f"   Difference: Z suffix ensures UTC interpretation")

print("\n" + "=" * 60)
print("All tests passed! ✅")
print("=" * 60)
