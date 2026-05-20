"""
PDF Ingestor - extracts text from PDF bytes or text content.
Uses basic text processing when PyMuPDF is not available.
"""


def extract_pdf_text(content: str) -> str:
    """
    Extract text from PDF content.
    Since demo data provides pre-extracted text, just return it cleaned.
    For real PDFs, PyMuPDF would be used.
    """
    return content.strip()


def extract_web_text(html: str) -> str:
    """Extract clean text from HTML using BeautifulSoup."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)
    except Exception:
        return html


def extract_csv_summary(content: str) -> dict:
    """Extract summary stats from CSV content using pandas."""
    try:
        import pandas as pd
        import io
        df = pd.read_csv(io.StringIO(content))
        return {
            "rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(3).to_dict(orient="records"),
            "numeric_summary": df.describe().to_dict() if not df.select_dtypes(include="number").empty else {},
        }
    except Exception as e:
        return {"error": str(e), "raw": content[:500]}
