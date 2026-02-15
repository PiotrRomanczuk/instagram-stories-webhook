#!/usr/bin/env python3
"""
Generate PDF progress report for a Guitar CRM student.

Usage:
    python generate_pdf_report.py --student-data student.json --output report.pdf

Or import and use programmatically:
    from generate_pdf_report import create_student_report
    create_student_report(student_data, output_path)
"""

import json
import argparse
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Status colors
STATUS_COLORS = {
    'to_learn': colors.HexColor('#fef3c7'),
    'started': colors.HexColor('#dbeafe'),
    'remembered': colors.HexColor('#f3e8ff'),
    'mastered': colors.HexColor('#dcfce7'),
    'completed': colors.HexColor('#dcfce7'),
    'cancelled': colors.HexColor('#fee2e2'),
    'scheduled': colors.HexColor('#fef3c7'),
}

def create_student_report(data: dict, output_path: str) -> str:
    """
    Create a PDF progress report for a student.

    Args:
        data: Dictionary containing:
            - student: {firstName, lastName, email, created_at}
            - lessons: [{date, status, songs, notes}, ...]
            - songs: [{title, author, level, status}, ...]
        output_path: Where to save the PDF

    Returns:
        Path to the generated PDF
    """
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    student = data['student']
    lessons = data.get('lessons', [])
    songs = data.get('songs', [])

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        textColor=colors.HexColor('#1e3a5f')
    )

    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#2d5a87')
    )

    # Title
    student_name = f"{student.get('firstName', '')} {student.get('lastName', '')}".strip()
    if not student_name:
        student_name = student.get('email', 'Unknown Student')

    story.append(Paragraph(f"Progress Report: {student_name}", title_style))
    story.append(Spacer(1, 10))

    # Student Info
    story.append(Paragraph(f"<b>Email:</b> {student.get('email', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>Report Date:</b> {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    if student.get('created_at'):
        story.append(Paragraph(f"<b>Student Since:</b> {student['created_at'][:10]}", styles['Normal']))
    story.append(Spacer(1, 20))

    # Summary Statistics
    story.append(Paragraph("Summary", section_style))

    completed_lessons = len([l for l in lessons if l.get('status') == 'completed'])
    song_counts = {
        'to_learn': len([s for s in songs if s.get('status') == 'to_learn']),
        'started': len([s for s in songs if s.get('status') == 'started']),
        'remembered': len([s for s in songs if s.get('status') == 'remembered']),
        'mastered': len([s for s in songs if s.get('status') == 'mastered']),
    }

    summary_data = [
        ['Metric', 'Value'],
        ['Total Lessons', str(len(lessons))],
        ['Completed Lessons', str(completed_lessons)],
        ['Total Songs', str(len(songs))],
        ['Songs Mastered', str(song_counts['mastered'])],
        ['Songs In Progress', str(song_counts['started'] + song_counts['remembered'])],
        ['Songs To Learn', str(song_counts['to_learn'])],
    ]

    summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 20))

    # Song Repertoire
    if songs:
        story.append(Paragraph("Song Repertoire", section_style))

        song_data = [['Song', 'Artist', 'Level', 'Status']]
        for song in songs:
            status = song.get('status', 'to_learn')
            song_data.append([
                song.get('title', 'Unknown'),
                song.get('author', 'Unknown'),
                song.get('level', 'N/A').title(),
                status.replace('_', ' ').title()
            ])

        song_table = Table(song_data, colWidths=[2.2*inch, 1.5*inch, 1*inch, 1*inch])

        # Base style
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]

        # Add status-based row colors
        for i, song in enumerate(songs, start=1):
            status = song.get('status', 'to_learn')
            if status in STATUS_COLORS:
                table_style.append(('BACKGROUND', (3, i), (3, i), STATUS_COLORS[status]))

        song_table.setStyle(TableStyle(table_style))
        story.append(song_table)
        story.append(Spacer(1, 20))

    # Recent Lessons
    if lessons:
        story.append(Paragraph("Recent Lessons", section_style))

        recent_lessons = sorted(lessons, key=lambda x: x.get('date', ''), reverse=True)[:5]

        lesson_data = [['Date', 'Status', 'Songs', 'Notes']]
        for lesson in recent_lessons:
            date_str = lesson.get('date', '')[:10] if lesson.get('date') else 'N/A'
            songs_covered = ', '.join([s.get('title', '') for s in lesson.get('songs', [])])[:40]
            notes = (lesson.get('notes', '') or '')[:50]
            if len(lesson.get('notes', '') or '') > 50:
                notes += '...'

            lesson_data.append([
                date_str,
                lesson.get('status', 'N/A').title(),
                songs_covered or 'None',
                notes or '-'
            ])

        lesson_table = Table(lesson_data, colWidths=[1*inch, 1*inch, 2*inch, 2*inch])
        lesson_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#28a745')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(lesson_table)

    # Build PDF
    doc.build(story)
    return output_path


def main():
    parser = argparse.ArgumentParser(description='Generate student progress report PDF')
    parser.add_argument('--student-data', required=True, help='JSON file with student data')
    parser.add_argument('--output', required=True, help='Output PDF path')
    args = parser.parse_args()

    with open(args.student_data, 'r') as f:
        data = json.load(f)

    output = create_student_report(data, args.output)
    print(f"Report generated: {output}")


if __name__ == '__main__':
    main()
