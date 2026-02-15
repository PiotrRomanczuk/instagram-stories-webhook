# Next.js Integration Guide

## API Route for Exports

Create an API route to generate exports server-side.

### File: `app/api/exports/student/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'pdf';
  const type = searchParams.get('type') || 'progress';

  const supabase = await createClient();

  // Fetch student data
  const { data: student } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', params.id)
    .single();

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Fetch lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, songs(*)')
    .eq('student_id', params.id)
    .order('date', { ascending: false });

  // Fetch songs with status
  const { data: songs } = await supabase
    .from('user_songs')
    .select('*, songs(*)')
    .eq('user_id', params.id);

  const exportData = {
    student,
    lessons: lessons || [],
    songs: songs?.map(us => ({ ...us.songs, status: us.status })) || [],
  };

  if (format === 'pdf') {
    const pdfBuffer = await generatePDF(exportData);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="progress-${student.firstName || 'student'}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } else {
    const excelBuffer = await generateExcel(exportData);
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="progress-${student.firstName || 'student'}-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  }
}

async function generatePDF(data: any): Promise<Buffer> {
  const doc = new jsPDF();
  const { student, lessons, songs } = data;

  // Title
  doc.setFontSize(20);
  doc.text('Student Progress Report', 20, 20);

  doc.setFontSize(12);
  const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;
  doc.text(`Student: ${name}`, 20, 35);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 42);

  // Song table
  doc.setFontSize(14);
  doc.text('Song Repertoire', 20, 60);

  autoTable(doc, {
    startY: 65,
    head: [['Song', 'Artist', 'Level', 'Status']],
    body: songs.map((song: any) => [
      song.title,
      song.author,
      song.level,
      (song.status || 'to_learn').replace('_', ' '),
    ]),
    headStyles: { fillColor: [68, 114, 196] },
  });

  // Lessons table
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Recent Lessons', 20, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Date', 'Status', 'Notes']],
    body: lessons.slice(0, 5).map((lesson: any) => [
      new Date(lesson.date).toLocaleDateString(),
      lesson.status || 'N/A',
      (lesson.notes || '').substring(0, 60),
    ]),
    headStyles: { fillColor: [40, 167, 69] },
  });

  return Buffer.from(doc.output('arraybuffer'));
}

async function generateExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const { student, lessons, songs } = data;

  // Songs sheet
  const songsSheet = workbook.addWorksheet('Songs');
  songsSheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Artist', key: 'author', width: 20 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Key', key: 'key', width: 8 },
  ];

  songs.forEach((song: any) => {
    songsSheet.addRow({
      title: song.title,
      author: song.author,
      level: song.level,
      status: (song.status || 'to_learn').replace('_', ' '),
      key: song.key,
    });
  });

  // Style header
  songsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  songsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  // Lessons sheet
  const lessonsSheet = workbook.addWorksheet('Lessons');
  lessonsSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Songs', key: 'songs', width: 40 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];

  lessons.forEach((lesson: any) => {
    lessonsSheet.addRow({
      date: new Date(lesson.date).toLocaleDateString(),
      status: lesson.status,
      songs: lesson.songs?.map((s: any) => s.title).join(', ') || '',
      notes: lesson.notes,
    });
  });

  lessonsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  lessonsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF28A745' },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
```

## Client Component: Export Button

```tsx
// components/students/ExportButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  studentId: string;
  studentName: string;
}

export function ExportButton({ studentId, studentName }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/exports/student/${studentId}?format=${format}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-${studentName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel Spreadsheet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Dependencies

```bash
npm install jspdf jspdf-autotable exceljs
npm install -D @types/jspdf
```

## Usage

Add the export button to student detail pages:

```tsx
// app/dashboard/students/[id]/page.tsx
import { ExportButton } from '@/components/students/ExportButton';

export default function StudentPage({ params }: { params: { id: string } }) {
  // ... fetch student data

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1>{student.firstName} {student.lastName}</h1>
        <ExportButton studentId={params.id} studentName={`${student.firstName} ${student.lastName}`} />
      </div>
      {/* ... rest of page */}
    </div>
  );
}
```
