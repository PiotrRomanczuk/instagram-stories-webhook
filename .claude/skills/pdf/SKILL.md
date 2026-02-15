---
name: pdf
description: PDF document creation and manipulation for generating student progress reports, lesson summaries, invoices, and certificates. Use when creating PDF exports for students, parents, or teacher records.
---

# PDF Processing Guide

## Overview

Create and manipulate PDF documents for Guitar CRM exports like progress reports, lesson summaries, and certificates.

## Quick Start - Creating PDFs

```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

def create_simple_pdf(output_path, title, content):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(1*inch, height - 1*inch, title)

    # Content
    c.setFont("Helvetica", 12)
    y = height - 1.5*inch
    for line in content:
        c.drawString(1*inch, y, line)
        y -= 0.3*inch

    c.save()
```

## Student Progress Report

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

def create_progress_report(student, songs, lessons, output_path):
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#1a365d')
    )
    story.append(Paragraph(f"Progress Report: {student['name']}", title_style))
    story.append(Spacer(1, 12))

    # Student Info
    story.append(Paragraph(f"<b>Email:</b> {student['email']}", styles['Normal']))
    story.append(Paragraph(f"<b>Report Date:</b> {student['report_date']}", styles['Normal']))
    story.append(Spacer(1, 20))

    # Song Progress Table
    story.append(Paragraph("Song Progress", styles['Heading2']))
    song_data = [['Song', 'Artist', 'Status', 'Started']]
    for song in songs:
        song_data.append([
            song['title'],
            song['artist'],
            song['status'].title(),
            song['started_date']
        ])

    song_table = Table(song_data, colWidths=[2*inch, 1.5*inch, 1*inch, 1*inch])
    song_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(song_table)
    story.append(Spacer(1, 20))

    # Lesson Summary
    story.append(Paragraph("Recent Lessons", styles['Heading2']))
    lesson_data = [['Date', 'Duration', 'Status', 'Notes']]
    for lesson in lessons[-5:]:  # Last 5 lessons
        lesson_data.append([
            lesson['date'],
            f"{lesson['duration']} min",
            lesson['status'].title(),
            lesson.get('notes', '')[:50]
        ])

    lesson_table = Table(lesson_data, colWidths=[1*inch, 0.8*inch, 1*inch, 2.7*inch])
    lesson_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#28a745')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    story.append(lesson_table)

    doc.build(story)
```

## Reading PDFs

```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

# Extract text
text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Merge PDFs

```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

## Dependencies

Install with: `pip install reportlab pypdf pdfplumber`

## Quick Reference

| Task | Library | Method |
|------|---------|--------|
| Create PDF | reportlab | `SimpleDocTemplate` or `canvas.Canvas` |
| Read PDF | pypdf | `PdfReader` |
| Extract text | pdfplumber | `page.extract_text()` |
| Extract tables | pdfplumber | `page.extract_tables()` |
| Merge PDFs | pypdf | `PdfWriter.add_page()` |
| Split PDF | pypdf | One page per writer |
