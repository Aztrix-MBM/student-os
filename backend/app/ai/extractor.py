import io
from typing import Tuple
from pypdf import PdfReader
from app.config import settings


class SyllabusExtractionError(Exception):
    def __init__(self, message: str, code: str = "EXTRACTION_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


def extract_text_from_pdf(
    file_bytes: bytes,
    max_size_bytes: int = settings.SYLLABUS_MAX_FILE_SIZE_BYTES,
    max_pages: int = settings.SYLLABUS_MAX_PAGES,
) -> Tuple[str, int]:
    """
    Extracts plain text from a syllabus PDF file.
    Validates:
    - File size (default <= 5MB)
    - Page count (default <= 30 pages)
    - Scanned/image-only PDF detection (requires minimum extractable text)

    :param file_bytes: Raw binary content of uploaded PDF.
    :param max_size_bytes: Maximum allowed file size in bytes.
    :param max_pages: Maximum allowed page count.
    :return: Tuple of (extracted_text, page_count).
    :raises SyllabusExtractionError: on validation or extraction failure.
    """
    if len(file_bytes) > max_size_bytes:
        size_mb = max_size_bytes // (1024 * 1024)
        raise SyllabusExtractionError(
            f"File exceeds maximum allowed size of {size_mb} MB.",
            code="FILE_TOO_LARGE",
        )

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        raise SyllabusExtractionError(
            f"Invalid or corrupted PDF file: {str(exc)}",
            code="INVALID_PDF",
        )

    num_pages = len(reader.pages)
    if num_pages == 0:
        raise SyllabusExtractionError(
            "The uploaded PDF file is empty.",
            code="EMPTY_PDF",
        )

    if num_pages > max_pages:
        raise SyllabusExtractionError(
            f"PDF has {num_pages} pages, which exceeds the limit of {max_pages} pages.",
            code="TOO_MANY_PAGES",
        )

    text_parts = []
    for idx, page in enumerate(reader.pages):
        try:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
        except Exception:
            continue

    combined_text = "\n".join(text_parts).strip()

    # If extracted text is less than 20 chars, the PDF is likely scanned / image-only
    if len(combined_text) < 20:
        raise SyllabusExtractionError(
            "This PDF contains scanned images or no extractable text. Please paste the syllabus text directly.",
            code="SCANNED_PDF_TEXT_REQUIRED",
        )

    return combined_text, num_pages
