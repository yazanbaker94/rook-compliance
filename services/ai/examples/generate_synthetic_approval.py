from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "output" / "pdf" / "corvus-synthetic-operating-approval.pdf"

CLAUSES = {
    14: (
        "14.1 Monthly wastewater inspection",
        "The approval holder shall inspect the wastewater discharge point at least once during each calendar month "
        "and record observed conditions in the site log.",
    ),
    18: (
        "18.2 Laboratory record retention",
        "Analytical results and chain-of-custody records must be retained for a minimum of five years.",
    ),
    22: (
        "22.1 Annual monitoring report",
        "An annual monitoring report for the preceding calendar year shall be submitted no later than March 31.",
    ),
}


def page_footer(canvas, document):
    canvas.saveState()
    width, _ = LETTER
    canvas.setStrokeColor(colors.HexColor("#D9D3C5"))
    canvas.line(0.72 * inch, 0.56 * inch, width - 0.72 * inch, 0.56 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#5F625D"))
    canvas.drawString(0.72 * inch, 0.37 * inch, "Synthetic demonstration document - not a regulatory approval")
    canvas.drawRightString(width - 0.72 * inch, 0.37 * inch, f"Page {document.page}")
    canvas.restoreState()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=27,
        textColor=colors.HexColor("#25362D"),
        spaceAfter=16,
    )
    section = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#25362D"),
        spaceAfter=10,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor("#343A35"),
        spaceAfter=12,
    )
    callout = ParagraphStyle(
        "Callout",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=17,
        textColor=colors.HexColor("#25362D"),
    )
    badge = ParagraphStyle(
        "Badge",
        parent=body,
        alignment=TA_CENTER,
        fontSize=9,
        textColor=colors.HexColor("#496052"),
    )

    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        rightMargin=0.72 * inch,
        leftMargin=0.72 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.82 * inch,
        title="Synthetic Operating Approval - Corvus/Rook Demo",
        author="Rook Demonstration Workspace",
    )

    story = []
    for page in range(1, 23):
        story.append(Paragraph("DEMONSTRATION OPERATING APPROVAL", badge))
        story.append(Spacer(1, 0.22 * inch))
        if page == 1:
            story.append(Paragraph("Operating Approval No. DEMO-2026-014", title))
            story.append(Paragraph("Prairie Demonstration Facility", section))
            story.append(Paragraph(
                "This synthetic document is provided only to demonstrate traceable obligation extraction, human review, "
                "field evidence collection, and audit history in the Rook compliance prototype.", body
            ))
            meta = Table([
                ["Approval holder", "Prairie Demonstration Operations Ltd."],
                ["Facility", "Prairie Demonstration Facility"],
                ["Jurisdiction", "Alberta, Canada (synthetic)"],
                ["Effective date", "January 1, 2026"],
            ], colWidths=[1.45 * inch, 4.9 * inch])
            meta.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF0EA")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#343A35")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D3C5")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(meta)
            story.append(Spacer(1, 0.25 * inch))
            story.append(Paragraph("Important", section))
            story.append(Paragraph(
                "All names, locations, clauses, and dates in this file are fictional. It is safe to upload to the public demo.",
                callout,
            ))
        elif page in CLAUSES:
            heading, clause = CLAUSES[page]
            story.append(Paragraph("Operating conditions", title))
            story.append(Paragraph(heading, section))
            callout_table = Table([[Paragraph(clause, callout)]], colWidths=[6.35 * inch])
            callout_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F2EEE0")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#C6A95A")),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]))
            story.append(callout_table)
            story.append(Spacer(1, 0.28 * inch))
            story.append(Paragraph("Supporting records", section))
            story.append(Paragraph(
                "Supporting records are expected to be legible, attributable to the facility, and available for reviewer verification.",
                body,
            ))
        else:
            story.append(Paragraph(f"General provisions - page {page}", title))
            story.append(Paragraph(
                "This page contains synthetic contextual material for the demonstration approval. It intentionally contains no "
                "enforceable clause so extraction results remain focused and easy to review.",
                body,
            ))
            story.append(Paragraph("Purpose of this section", section))
            story.append(Paragraph(
                "The demonstration shows how long source documents can be converted into a concise, traceable review queue without "
                "treating automated extraction as a final compliance decision.",
                body,
            ))
        if page < 22:
            story.append(PageBreak())

    document.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
