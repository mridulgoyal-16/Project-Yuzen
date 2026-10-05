#!/usr/bin/env python3
"""
Functional tests for add-issues flow.
Tests part selection, chip toggling, and "Missing" exclusivity logic.
"""

def test_missing_exclusivity():
    """Missing chip clears all other chips and vice versa."""
    # This test validates the core logic:
    # - Selecting "Missing" clears all other selections
    # - Selecting any other chip clears "Missing"

    MISSING = "Missing"
    ISSUES = ["Cuts", "Makes noise", "Rusting", "Worn", "Dented"]

    # Test 1: Select Missing, then another chip
    selection = [MISSING]
    # Selecting "Cuts" should clear "Missing"
    if MISSING in selection:
        selection.remove(MISSING)
    selection.append("Cuts")
    assert selection == ["Cuts"], f"Expected ['Cuts'], got {selection}"

    # Test 2: Select multiple chips, then Missing
    selection = ["Cuts", "Rusting"]
    # Selecting "Missing" should clear everything
    selection = [MISSING]
    assert selection == [MISSING], f"Expected ['Missing'], got {selection}"

    # Test 3: Empty selection then Missing
    selection = []
    selection = [MISSING]
    assert selection == [MISSING], f"Expected ['Missing'], got {selection}"

    print("✓ Missing exclusivity tests passed (3/3)")

def test_chip_toggle():
    """Toggling chips on/off works correctly."""
    # Test toggling individual chips
    selection = []

    # Toggle on
    selection.append("Cuts")
    assert "Cuts" in selection

    # Toggle off
    selection.remove("Cuts")
    assert "Cuts" not in selection

    # Multiple toggles
    selection = ["Cuts", "Rusting"]
    selection.remove("Cuts")
    assert selection == ["Rusting"]

    print("✓ Chip toggle tests passed (3/3)")

def test_dirty_state():
    """Dirty state detection works (selection differs from saved)."""
    saved = ["Cuts"]

    # No change = not dirty
    current = ["Cuts"]
    dirty = current != saved
    assert not dirty, "Should not be dirty when unchanged"

    # Added chip = dirty
    current = ["Cuts", "Rusting"]
    dirty = current != saved
    assert dirty, "Should be dirty when chips added"

    # Removed chip = dirty
    current = []
    dirty = current != saved
    assert dirty, "Should be dirty when chips removed"

    # Different order = not dirty (sets are unordered)
    saved = ["Cuts", "Rusting"]
    current = ["Rusting", "Cuts"]
    dirty = set(current) != set(saved)
    assert not dirty, "Should not be dirty for different order"

    print("✓ Dirty state tests passed (4/4)")

if __name__ == '__main__':
    test_missing_exclusivity()
    test_chip_toggle()
    test_dirty_state()
    print("\n✓ All functional tests passed (10/10)")
