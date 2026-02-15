---
name: skill-creator
description: Guide for creating new Claude Code skills to extend capabilities with specialized workflows. Use when creating custom skills for Guitar CRM like lesson-plan-generator, student-report, or practice-schedule.
---

# Skill Creator Guide

## Overview

Create custom skills to extend Claude's capabilities with Guitar CRM-specific workflows and domain knowledge.

## Skill Structure

```
skill-name/
├── SKILL.md           # Required: Instructions and metadata
├── scripts/           # Optional: Executable code
├── references/        # Optional: Documentation to load as needed
└── assets/            # Optional: Templates, images, fonts
```

## SKILL.md Format

```markdown
---
name: skill-name
description: Clear description of what this skill does and when to use it.
---

# Skill Title

## Overview
Brief explanation of the skill's purpose.

## Usage
Step-by-step instructions for using the skill.

## Examples
Concrete examples of inputs and outputs.
```

## Guitar CRM Skill Ideas

### 1. Lesson Plan Generator

```markdown
---
name: lesson-plan-generator
description: Generate structured lesson plans for guitar students based on their skill level, current songs, and learning goals. Use when preparing for lessons or creating practice schedules.
---

# Lesson Plan Generator

## Inputs Required
- Student name and skill level (beginner/intermediate/advanced)
- Current songs in progress
- Recent lesson notes
- Session duration

## Output Format
1. Warm-up exercises (5 min)
2. Technique focus (10 min)
3. Song work - ordered by priority
4. New material introduction
5. Homework assignments

## Skill Level Guidelines

### Beginner
- Focus on open chords, basic strumming
- One song at a time
- Short practice segments

### Intermediate
- Barre chords, fingerpicking patterns
- Multiple songs in rotation
- Theory integration

### Advanced
- Complex techniques, improvisation
- Performance preparation
- Music theory application
```

### 2. Progress Report Generator

```markdown
---
name: student-progress-report
description: Generate comprehensive progress reports for students or parents showing lesson attendance, song mastery, and skill development over time.
---

# Student Progress Report

## Data Sources
- Lesson history from Supabase
- Song status progression
- Assignment completion rates

## Report Sections
1. Executive Summary
2. Attendance Record
3. Songs Mastered This Period
4. Skills Developed
5. Areas for Improvement
6. Recommended Next Steps

## Export Formats
- PDF (for parents)
- DOCX (editable)
- XLSX (data analysis)
```

### 3. Practice Schedule Builder

```markdown
---
name: practice-schedule
description: Create personalized weekly practice schedules based on student goals, available time, and current repertoire.
---

# Practice Schedule Builder

## Input Parameters
- Available practice days/times
- Current songs and their status
- Technique areas to develop
- Upcoming performance dates

## Schedule Structure
- Daily warm-up routine
- Focused practice blocks (15-20 min each)
- Review sessions
- Rest days

## Output
Generates a printable weekly schedule with:
- Specific exercises and songs for each day
- Time allocations
- Progress checkboxes
```

## Creating a New Skill

### Step 1: Define the Purpose

Ask:
- What specific task does this skill help with?
- When should Claude use this skill?
- What inputs are needed?
- What outputs are expected?

### Step 2: Create the Structure

```bash
mkdir -p .claude/skills/my-skill/{scripts,references,assets}
touch .claude/skills/my-skill/SKILL.md
```

### Step 3: Write SKILL.md

Keep it concise - Claude is smart. Include only:
- Non-obvious domain knowledge
- Specific formatting requirements
- Error handling guidance
- Examples of good outputs

### Step 4: Add Resources (Optional)

**Scripts** - For deterministic operations:
```python
# scripts/calculate_practice_time.py
def calculate_weekly_time(songs, skill_level):
    base_time = {'beginner': 15, 'intermediate': 25, 'advanced': 40}
    return base_time[skill_level] * len(songs)
```

**References** - For detailed documentation:
```markdown
# references/chord-progressions.md
Common progressions by genre...
```

**Assets** - For templates:
```
assets/
├── lesson-plan-template.docx
├── certificate-template.pdf
└── logo.png
```

## Best Practices

1. **Keep SKILL.md under 500 lines** - Split into references if longer
2. **Use progressive disclosure** - Core instructions in SKILL.md, details in references
3. **Include concrete examples** - Show expected inputs and outputs
4. **Test with real scenarios** - Verify the skill works for actual use cases
5. **Iterate based on usage** - Refine after seeing how the skill performs

## Skill Location

Place skills in: `.claude/skills/`

They will be automatically discovered and available for use.
