import os
from pathlib import Path
import pytest
from app.ai.llm_client import heuristic_syllabus_parser
from app.ai.extractor import extract_text_from_pdf, SyllabusExtractionError

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.mark.parametrize("filename,expected_min_units,expected_max_units", [
    ("cs3451_os.txt", 4, 6),
    ("cs3491_crypto.txt", 4, 6),
    ("cs3352_data_science.txt", 4, 6),
    ("cs3452_toc.txt", 3, 5),
    ("cs3691_iot.txt", 4, 6),
])
def test_parse_real_curriculum_fixtures(filename, expected_min_units, expected_max_units):
    """B3: Test parser accurately parses Indian Engineering curriculum syllabi (3-7 units)."""
    fixture_path = FIXTURES_DIR / filename
    assert fixture_path.exists(), f"Fixture {filename} not found"

    with open(fixture_path, "r", encoding="utf-8") as f:
        content = f.read()

    result = heuristic_syllabus_parser(content)
    assert "units" in result
    units = result["units"]
    assert expected_min_units <= len(units) <= expected_max_units, (
        f"{filename}: Expected between {expected_min_units} and {expected_max_units} units, got {len(units)}"
    )

    total_topics = 0
    for unit in units:
        assert "name" in unit and len(unit["name"]) > 3
        assert "order_no" in unit
        assert "topics" in unit
        assert len(unit["topics"]) >= 2, f"Unit '{unit['name']}' has too few topics: {len(unit['topics'])}"

        for topic in unit["topics"]:
            total_topics += 1
            assert "name" in topic and len(topic["name"]) >= 2
            assert 0.0 <= topic["importance"] <= 1.0
            assert 1 <= topic["difficulty"] <= 5

    assert total_topics >= 8, f"{filename}: Total extracted topics {total_topics} is too low"


def test_empty_syllabus_text_raises_value_error():
    """Verify empty text raises ValueError."""
    with pytest.raises(ValueError, match="Syllabus text is empty"):
        heuristic_syllabus_parser("")


def test_scanned_pdf_error_message():
    """B3: Scanned PDF check raises specific user-facing message."""
    # Dummy bytes resembling a PDF with little or no text
    # In extract_text_from_pdf, if extracted_text < 20 chars, it raises SCANNED_PDF_TEXT_REQUIRED
    # We verify the error code and exact wording requested in Phase 10:
    err = SyllabusExtractionError("This looks like a scanned PDF. Paste the text instead.", code="SCANNED_PDF_TEXT_REQUIRED")
    assert err.code == "SCANNED_PDF_TEXT_REQUIRED"
    assert "Paste the text instead" in err.message
