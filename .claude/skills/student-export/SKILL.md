---
name: student-export
description: Generate student progress exports in PDF or Excel format. Use when teachers need to export student data, create progress reports for parents, generate lesson summaries, or analyze student performance over time. Supports individual student reports and bulk class exports.
---

# Student Export Generator

## Overview

Generate professional exports of Guitar CRM student data in PDF or Excel format. Tailored for teachers sharing progress with parents or analyzing student performance.

## Usage

When invoked, ask the user:
1. **Export type**: Individual student or all students?
2. **Format**: PDF (for sharing) or Excel (for analysis)?
3. **Content**: Full report, lessons only, songs only, or summary?
4. **Date range**: All time, this month, custom range?

## Export Types

### 1. Individual Student Progress Report (PDF)

Best for: Sharing with parents, student records

**Includes:**
- Student info (name, email, start date)
- Lesson attendance summary
- Song repertoire with status breakdown
- Progress timeline
- Recent lesson notes
- Recommendations

### 2. Student Roster Export (Excel)

Best for: Administrative records, bulk analysis

**Columns:**
- Name, Email, Role, Active Status
- Total Lessons, Lessons This Month
- Songs: To Learn / Started / Remembered / Mastered
- Last Lesson Date
- Notes

### 3. Lesson History Export (Excel)

Best for: Scheduling analysis, attendance tracking

**Columns:**
- Date, Time, Student Name
- Lesson Number, Duration, Status
- Songs Covered, Notes

### 4. Song Progress Matrix (Excel)

Best for: Curriculum planning, progress tracking

**Format:** Students as rows, songs as columns, status as cell values

## Data Model Reference

```typescript
// User (Student)
interface User {
  user_id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isStudent?: boolean;
  isActive?: boolean;
  created_at?: string;
}

// Song with progress status
interface Song {
  id: string;
  title: string;
  author: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status?: 'to_learn' | 'started' | 'remembered' | 'mastered';
  key: string;
  chords?: string;
}

// Lesson
interface Lesson {
  id: string;
  lesson_number: number;
  student_id: string;
  date: Date;
  start_time?: string;
  status?: string;  // scheduled, completed, cancelled, rescheduled
  songs: Song[];
  notes: string;
}
```

## Implementation

### PDF Progress Report

```typescript
import {
  Document, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, Packer
} from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentReportData {
  student: User;
  lessons: Lesson[];
  songs: Song[];
  dateRange: { start: Date; end: Date };
}

function generatePDFReport(data: StudentReportData): jsPDF {
  const doc = new jsPDF();
  const { student, lessons, songs } = data;

  // Header
  doc.setFontSize(20);
  doc.text('Student Progress Report', 20, 20);

  doc.setFontSize(12);
  doc.text(`Student: ${student.firstName} ${student.lastName}`, 20, 35);
  doc.text(`Email: ${student.email}`, 20, 42);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 49);

  // Summary Stats
  doc.setFontSize(14);
  doc.text('Summary', 20, 65);

  const completedLessons = lessons.filter(l => l.status === 'completed').length;
  const songsByStatus = {
    to_learn: songs.filter(s => s.status === 'to_learn').length,
    started: songs.filter(s => s.status === 'started').length,
    remembered: songs.filter(s => s.status === 'remembered').length,
    mastered: songs.filter(s => s.status === 'mastered').length,
  };

  doc.setFontSize(11);
  doc.text(`Total Lessons: ${lessons.length} (${completedLessons} completed)`, 20, 75);
  doc.text(`Songs: ${songs.length} total`, 20, 82);
  doc.text(`  • To Learn: ${songsByStatus.to_learn}`, 25, 89);
  doc.text(`  • Started: ${songsByStatus.started}`, 25, 96);
  doc.text(`  • Remembered: ${songsByStatus.remembered}`, 25, 103);
  doc.text(`  • Mastered: ${songsByStatus.mastered}`, 25, 110);

  // Song Progress Table
  doc.setFontSize(14);
  doc.text('Song Repertoire', 20, 130);

  autoTable(doc, {
    startY: 135,
    head: [['Song', 'Artist', 'Level', 'Status']],
    body: songs.map(song => [
      song.title,
      song.author,
      song.level,
      song.status?.replace('_', ' ').toUpperCase() || 'N/A'
    ]),
    headStyles: { fillColor: [68, 114, 196] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Recent Lessons
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Recent Lessons', 20, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Date', 'Status', 'Songs Covered', 'Notes']],
    body: lessons.slice(-5).reverse().map(lesson => [
      new Date(lesson.date).toLocaleDateString(),
      lesson.status || 'N/A',
      lesson.songs.map(s => s.title).join(', ') || 'None',
      (lesson.notes || '').substring(0, 50) + (lesson.notes?.length > 50 ? '...' : '')
    ]),
    headStyles: { fillColor: [40, 167, 69] },
  });

  return doc;
}
```

### Excel Roster Export

```typescript
import { Workbook, Worksheet } from 'exceljs';

interface RosterExportData {
  students: Array<{
    user: User;
    lessonCount: number;
    lessonsThisMonth: number;
    songCounts: { to_learn: number; started: number; remembered: number; mastered: number };
    lastLessonDate: Date | null;
  }>;
}

async function generateExcelRoster(data: RosterExportData): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Student Roster');

  // Headers
  sheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Total Lessons', key: 'totalLessons', width: 15 },
    { header: 'This Month', key: 'thisMonth', width: 12 },
    { header: 'To Learn', key: 'toLearn', width: 10 },
    { header: 'Started', key: 'started', width: 10 },
    { header: 'Remembered', key: 'remembered', width: 12 },
    { header: 'Mastered', key: 'mastered', width: 10 },
    { header: 'Last Lesson', key: 'lastLesson', width: 15 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Add data
  data.students.forEach(student => {
    sheet.addRow({
      name: `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() || student.user.email,
      email: student.user.email,
      totalLessons: student.lessonCount,
      thisMonth: student.lessonsThisMonth,
      toLearn: student.songCounts.to_learn,
      started: student.songCounts.started,
      remembered: student.songCounts.remembered,
      mastered: student.songCounts.mastered,
      lastLesson: student.lastLessonDate ? new Date(student.lastLessonDate).toLocaleDateString() : 'Never',
    });
  });

  // Conditional formatting for mastered songs
  sheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      const masteredCell = row.getCell('mastered');
      if (Number(masteredCell.value) >= 5) {
        masteredCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' }
        };
      }
    }
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}
```

## File Naming Convention

```
student-progress_{studentName}_{date}.pdf
student-roster_{date}.xlsx
lesson-history_{date}.xlsx
song-matrix_{date}.xlsx
```

## Dependencies

For PDF generation:
```bash
npm install jspdf jspdf-autotable
# or
pip install reportlab
```

For Excel generation:
```bash
npm install exceljs
# or
pip install openpyxl
```

## Status Color Coding

Apply consistent colors in exports:

| Status | Excel Fill | PDF Color |
|--------|------------|-----------|
| to_learn | `FFFFEB9C` (yellow) | `#fef3c7` |
| started | `FFB4C6E7` (blue) | `#dbeafe` |
| remembered | `FFE2D5F4` (purple) | `#f3e8ff` |
| mastered | `FFC6EFCE` (green) | `#dcfce7` |
| completed | `FFC6EFCE` (green) | `#dcfce7` |
| cancelled | `FFFFC7CE` (red) | `#fee2e2` |
| scheduled | `FFFFEB9C` (yellow) | `#fef3c7` |

## Example Prompts

- "Export John's progress report as PDF"
- "Generate Excel roster of all active students"
- "Create lesson history export for this month"
- "Export song progress matrix for my class"
- "Generate PDF report for Sarah to share with her parents"
