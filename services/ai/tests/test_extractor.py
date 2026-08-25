from app.extractor import extract_obligations

SAMPLE = """
--- PAGE 14 ---
The approval holder shall inspect the wastewater discharge point at least once during each calendar month.
General background information that creates no obligation.
--- PAGE 22 ---
An annual monitoring report for the preceding calendar year must be submitted no later than March 31.
"""

def test_extracts_traceable_obligations():
    results = extract_obligations(SAMPLE)
    assert len(results) == 2
    assert results[0]["source_page"] == 14
    assert results[0]["frequency"] == "Monthly"
    assert results[1]["source_page"] == 22
    assert results[1]["confidence"] >= 0.9

def test_ignores_non_obligation_prose():
    assert extract_obligations("This document describes a facility and its surrounding area.") == []
