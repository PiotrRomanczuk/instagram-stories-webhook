---
name: docx
description: Word document creation and editing for generating lesson plans, practice schedules, and student handouts. Use when creating editable documents that students or teachers can modify, or when working with existing Word documents.
---

# Word Document Processing

## Overview

Create and edit Word documents for Guitar CRM exports like lesson plans, practice schedules, and student handouts using the docx-js library.

## Quick Start - Creating Documents

```typescript
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  Packer
} from 'docx';
import * as fs from 'fs';

async function createDocument() {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: "Guitar Lesson Plan",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Student: ", bold: true }),
            new TextRun("John Doe"),
          ],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("lesson-plan.docx", buffer);
}
```

## Lesson Plan Template

```typescript
import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, Packer } from 'docx';

interface LessonPlan {
  studentName: string;
  date: string;
  duration: number;
  objectives: string[];
  songs: Array<{ title: string; focus: string }>;
  homework: string[];
  notes: string;
}

async function createLessonPlan(plan: LessonPlan): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        // Header
        new Paragraph({
          text: "Guitar Lesson Plan",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),

        // Student info
        new Paragraph({
          children: [
            new TextRun({ text: "Student: ", bold: true }),
            new TextRun(plan.studentName),
            new TextRun({ text: "  |  Date: ", bold: true }),
            new TextRun(plan.date),
            new TextRun({ text: "  |  Duration: ", bold: true }),
            new TextRun(`${plan.duration} minutes`),
          ],
          spacing: { after: 300 },
        }),

        // Objectives
        new Paragraph({
          text: "Lesson Objectives",
          heading: HeadingLevel.HEADING_2,
        }),
        ...plan.objectives.map(obj => new Paragraph({
          text: `• ${obj}`,
          spacing: { after: 100 },
        })),

        // Songs table
        new Paragraph({
          text: "Songs to Practice",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Song", bold: true })],
                  shading: { fill: "4472C4" },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Focus Area", bold: true })],
                  shading: { fill: "4472C4" },
                }),
              ],
            }),
            ...plan.songs.map(song => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(song.title)] }),
                new TableCell({ children: [new Paragraph(song.focus)] }),
              ],
            })),
          ],
        }),

        // Homework
        new Paragraph({
          text: "Homework",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        ...plan.homework.map(hw => new Paragraph({
          text: `☐ ${hw}`,
          spacing: { after: 100 },
        })),

        // Notes
        new Paragraph({
          text: "Notes",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        new Paragraph({
          text: plan.notes || "No additional notes.",
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
```

## Practice Schedule Template

```typescript
async function createPracticeSchedule(
  studentName: string,
  weeklyGoals: Array<{ day: string; tasks: string[] }>
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: `Weekly Practice Schedule - ${studentName}`,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "Aim for 15-30 minutes of focused practice each day.",
          spacing: { after: 300 },
        }),
        ...weeklyGoals.flatMap(day => [
          new Paragraph({
            text: day.day,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200 },
          }),
          ...day.tasks.map(task => new Paragraph({
            text: `☐ ${task}`,
          })),
        ]),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
```

## Reading Word Documents

```typescript
import * as mammoth from 'mammoth';

async function extractText(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function convertToHtml(filePath: string): Promise<string> {
  const result = await mammoth.convertToHtml({ path: filePath });
  return result.value;
}
```

## Dependencies

```bash
npm install docx mammoth
```

## Quick Reference

| Task | Library | Method |
|------|---------|--------|
| Create document | docx | `new Document({ sections: [...] })` |
| Add paragraph | docx | `new Paragraph({ text: "..." })` |
| Add heading | docx | `heading: HeadingLevel.HEADING_1` |
| Add table | docx | `new Table({ rows: [...] })` |
| Save to file | docx | `Packer.toBuffer(doc)` |
| Read document | mammoth | `extractRawText({ path })` |
| Convert to HTML | mammoth | `convertToHtml({ path })` |
