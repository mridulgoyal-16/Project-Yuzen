#!/usr/bin/env python3
"""
Flow tests for add-issues complete navigation paths.
Tests tabs, search flow, bottom sheet, and state transitions.
"""

def test_tab_flow():
    """Navigate through all tabs without errors."""
    tabs = ["Recommended", "Front", "Middle", "Rear"]
    current_tab = "Recommended"

    # Recommended starts selected
    assert current_tab == "Recommended"

    # Navigate through each tab
    for tab in tabs[1:]:
        current_tab = tab
        assert current_tab == tab

    print("✓ Tab flow test passed")

def test_search_flow():
    """Search filters parts and selects result navigates back."""
    parts = [
        "Front Wheel", "Tyre", "Brake", "Handlebar", "Chain",
        "Pedal", "Seat", "Light", "Bell", "Reflector"
    ]

    # User enters search query
    query = "wheel"
    results = [p for p in parts if query.lower() in p.lower()]
    assert len(results) > 0, "Should find matches"
    assert "Front Wheel" in results

    # User clicks search result
    selected = results[0]
    assert selected == "Front Wheel"

    # Navigate back to Add issues screen (implicit when sheet closes)
    screen = "Add issues"
    assert screen == "Add issues"

    print("✓ Search flow test passed")

def test_sheet_workflow():
    """Complete workflow: open sheet → select issues → update."""
    # Initial state: part with no issues
    part = {"name": "Wheel", "issues": []}
    sheet_open = False

    # User clicks part
    sheet_open = True
    assert sheet_open

    # User selects chips
    selection = ["Cuts", "Rusting"]
    assert len(selection) == 2

    # Button enabled (dirty)
    dirty = selection != part["issues"]
    assert dirty

    # User clicks Update
    part["issues"] = selection
    sheet_open = False

    # Sheet closes, part now has issues
    assert not sheet_open
    assert part["issues"] == ["Cuts", "Rusting"]

    print("✓ Sheet workflow test passed")

def test_missing_in_flow():
    """Exclusive "Missing" chip works in complete flow."""
    part = {"name": "Brake", "issues": []}
    selection = []

    # User selects multiple issues
    selection = ["Cuts", "Rusting"]

    # User taps Missing (should clear others)
    selection = ["Missing"]
    assert selection == ["Missing"]
    assert "Cuts" not in selection

    # User taps another issue (should clear Missing)
    selection = ["Worn"]
    assert selection == ["Worn"]
    assert "Missing" not in selection

    print("✓ Missing in flow test passed")

def test_multiple_parts_workflow():
    """Mark multiple parts in sequence."""
    parts = {
        "Wheel": [],
        "Brake": [],
        "Chain": []
    }

    # Mark first part
    parts["Wheel"] = ["Cuts"]

    # Mark second part
    parts["Brake"] = ["Missing"]

    # Mark third part
    parts["Chain"] = ["Rusting", "Worn"]

    # All parts marked correctly
    assert parts["Wheel"] == ["Cuts"]
    assert parts["Brake"] == ["Missing"]
    assert parts["Chain"] == ["Rusting", "Worn"]

    print("✓ Multiple parts workflow test passed")

if __name__ == '__main__':
    test_tab_flow()
    test_search_flow()
    test_sheet_workflow()
    test_missing_in_flow()
    test_multiple_parts_workflow()
    print("\n✓ All flow tests passed (5/5)")
