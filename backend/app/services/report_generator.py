import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.models.submission import CodeSubmission


class ReportGenerator:
    def generate_submission_pdf(self, submission: CodeSubmission) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Define modern styles
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=15,
            alignment=TA_LEFT
        )
        
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=colors.HexColor("#3b82f6"),
            spaceAfter=10,
            spaceBefore=15
        )

        body_style = ParagraphStyle(
            name="BodyStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#475569"),
            leading=14
        )

        code_style = ParagraphStyle(
            name="CodeStyle",
            parent=styles["Normal"],
            fontName="Courier",
            fontSize=8.5,
            textColor=colors.HexColor("#e2e8f0"),
            leading=11
        )

        story = []

        # Header Title
        story.append(Paragraph("Spotlight AI - Security Analysis Report", title_style))
        story.append(Spacer(1, 10))

        # Metadata Table
        created_str = submission.created_at.strftime("%Y-%m-%d %H:%M:%S") if submission.created_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        metadata_data = [
            [
                Paragraph("<b>Submission ID:</b>", body_style),
                Paragraph(str(submission.id), body_style)
            ],
            [
                Paragraph("<b>Language:</b>", body_style),
                Paragraph(submission.language.value.upper(), body_style)
            ],
            [
                Paragraph("<b>Type:</b>", body_style),
                Paragraph(submission.submission_type.value.upper(), body_style)
            ],
            [
                Paragraph("<b>Filename:</b>", body_style),
                Paragraph(submission.filename or "N/A", body_style)
            ],
            [
                Paragraph("<b>Timestamp:</b>", body_style),
                Paragraph(created_str, body_style)
            ]
        ]

        meta_table = Table(metadata_data, colWidths=[110, 430])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # Status Banner
        status_bg = "#ecfdf5" if submission.is_valid_syntax else "#fef2f2"
        status_border = "#10b981" if submission.is_valid_syntax else "#ef4444"
        status_text_color = "#065f46" if submission.is_valid_syntax else "#991b1b"
        status_msg = "<b>SYNTAX VERIFIED: SUCCESS</b>" if submission.is_valid_syntax else "<b>SYNTAX VERIFIED: ERRORS DETECTED</b>"

        status_para_style = ParagraphStyle(
            name="StatusPara",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=colors.HexColor(status_text_color),
            alignment=TA_CENTER
        )

        status_data = [[Paragraph(status_msg, status_para_style)]]
        status_table = Table(status_data, colWidths=[540])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(status_bg)),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.HexColor(status_border)),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 15))

        # Vulnerabilities / Warnings Section
        if submission.validation_errors:
            story.append(Paragraph("Detected Issues & Warnings", subtitle_style))
            story.append(Spacer(1, 5))
            
            issues_data = [[
                Paragraph("<b>Line</b>", body_style),
                Paragraph("<b>Details / Guidance</b>", body_style)
            ]]
            
            for err in submission.validation_errors:
                line_str = str(err.get("line")) if err.get("line") is not None else "N/A"
                issues_data.append([
                    Paragraph(line_str, body_style),
                    Paragraph(err.get("message", "Unknown error"), body_style)
                ])
                
            issues_table = Table(issues_data, colWidths=[50, 490])
            issues_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#fee2e2")),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#fca5a5")),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#f87171")),
            ]))
            story.append(issues_table)
            story.append(Spacer(1, 15))
        else:
            story.append(Paragraph("Security & Code Quality Details", subtitle_style))
            story.append(Spacer(1, 5))
            ok_para_style = ParagraphStyle(
                name="OkPara",
                parent=body_style,
                textColor=colors.HexColor("#1e293b")
            )
            story.append(Paragraph("No critical compiler syntax errors or basic secure coding rule violations were detected during initial static analysis validation.", ok_para_style))
            story.append(Spacer(1, 15))

        # Code Listing
        story.append(Paragraph("Submitted Code Listing", subtitle_style))
        story.append(Spacer(1, 5))

        # Add line numbers to the code listing
        lines = submission.source_code.splitlines()
        numbered_code = "\n".join(f"{i+1:3d} | {line}" for i, line in enumerate(lines))

        code_data = [[Preformatted(numbered_code, code_style)]]
        code_table = Table(code_data, colWidths=[540])
        code_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#0f172a")),
            ('PADDING', (0, 0), (-1, -1), 12),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1e293b")),
        ]))
        story.append(code_table)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes


report_generator = ReportGenerator()
