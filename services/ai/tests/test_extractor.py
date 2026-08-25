from pathlib import Path

from fastapi.testclient import TestClient

from app.extractor import extract_obligations
from app.main import app

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


def test_normalizes_visual_line_wraps_before_sentence_detection():
    wrapped = """PAGE 7
The approval holder shall inspect the wastewater
discharge point during each calendar month and record
the observed condition in the site log.
"""
    results = extract_obligations(wrapped)
    assert len(results) == 1
    assert results[0]["source_page"] == 7
    assert "wastewater discharge point" in results[0]["requirement"]


def test_removes_layout_headings_from_pdf_clause_text():
    layout_text = """PAGE 14
DEMONSTRATION OPERATING APPROVAL
Operating conditions
14.1 Monthly wastewater inspection
The approval holder shall inspect the wastewater discharge point once each calendar month.
"""
    results = extract_obligations(layout_text)
    assert results[0]["requirement"].startswith("The approval holder shall")


def test_extracts_uploaded_synthetic_pdf_with_physical_page_citations():
    fixture = Path(__file__).resolve().parents[3] / "output" / "pdf" / "corvus-synthetic-operating-approval.pdf"
    with fixture.open("rb") as approval:
        response = TestClient(app).post(
            "/extract-file",
            files={"file": (fixture.name, approval, "application/pdf")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["page_count"] == 22
    assert payload["proposal_count"] == 3
    assert [item["source_page"] for item in payload["proposals"]] == [14, 18, 22]
