---
name: xlsx
description: Excel spreadsheet creation and manipulation for exporting student data, lesson reports, progress tracking, and analytics. Use when generating Excel exports of students, lessons, song progress, or any tabular data that teachers need for records or analysis.
---

# Excel Spreadsheet Processing

## Overview

Create and manipulate Excel spreadsheets using Python libraries. Ideal for exporting Guitar CRM data like student lists, lesson schedules, progress reports, and analytics.

## Quick Start

```python
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill

# Create new workbook
wb = Workbook()
ws = wb.active
ws.title = "Students"

# Add headers
headers = ["Name", "Email", "Lessons Completed", "Songs Mastered"]
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = Font(bold=True)
    cell.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    cell.font = Font(bold=True, color="FFFFFF")

# Save
wb.save("students_export.xlsx")
```

## Common Patterns for Guitar CRM

### Export Student Progress

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

def export_student_progress(students_data, output_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Student Progress"

    headers = ["Student", "Email", "Total Lessons", "Songs To Learn",
               "Songs Started", "Songs Remembered", "Songs Mastered"]

    # Style headers
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill

    # Add data
    for row, student in enumerate(students_data, 2):
        ws.cell(row=row, column=1, value=student['name'])
        ws.cell(row=row, column=2, value=student['email'])
        ws.cell(row=row, column=3, value=student['total_lessons'])
        ws.cell(row=row, column=4, value=student['to_learn'])
        ws.cell(row=row, column=5, value=student['started'])
        ws.cell(row=row, column=6, value=student['remembered'])
        ws.cell(row=row, column=7, value=student['mastered'])

    # Auto-fit columns
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15

    wb.save(output_path)
```

### Export Lesson Schedule

```python
def export_lesson_schedule(lessons_data, output_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Lesson Schedule"

    headers = ["Date", "Time", "Student", "Status", "Notes"]

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = Font(bold=True)

    status_colors = {
        'scheduled': 'FFEB9C',  # Yellow
        'completed': 'C6EFCE',  # Green
        'cancelled': 'FFC7CE',  # Red
        'rescheduled': 'B4A7D6'  # Purple
    }

    for row, lesson in enumerate(lessons_data, 2):
        ws.cell(row=row, column=1, value=lesson['date'])
        ws.cell(row=row, column=2, value=lesson['time'])
        ws.cell(row=row, column=3, value=lesson['student_name'])

        status_cell = ws.cell(row=row, column=4, value=lesson['status'])
        if lesson['status'] in status_colors:
            status_cell.fill = PatternFill(
                start_color=status_colors[lesson['status']],
                end_color=status_colors[lesson['status']],
                fill_type="solid"
            )

        ws.cell(row=row, column=5, value=lesson.get('notes', ''))

    wb.save(output_path)
```

## Reading Excel Files

```python
from openpyxl import load_workbook

wb = load_workbook("data.xlsx")
ws = wb.active

# Read all rows
data = []
for row in ws.iter_rows(min_row=2, values_only=True):  # Skip header
    data.append({
        'name': row[0],
        'email': row[1],
        'value': row[2]
    })
```

## Dependencies

Install with: `pip install openpyxl`

## Quick Reference

| Task | Code |
|------|------|
| Create workbook | `wb = Workbook()` |
| Get active sheet | `ws = wb.active` |
| Add value | `ws.cell(row=1, column=1, value="text")` |
| Bold text | `cell.font = Font(bold=True)` |
| Background color | `cell.fill = PatternFill(...)` |
| Column width | `ws.column_dimensions['A'].width = 20` |
| Save | `wb.save("file.xlsx")` |
| Load existing | `wb = load_workbook("file.xlsx")` |
