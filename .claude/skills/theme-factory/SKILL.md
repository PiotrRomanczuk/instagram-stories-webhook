---
name: theme-factory
description: Theme generation and management toolkit for creating consistent color palettes and font pairings. Use when customizing the Guitar CRM theme, creating branded exports, or generating styled documents and reports.
---

# Theme Factory

## Overview

Generate and apply consistent themes with color palettes and font pairings for Guitar CRM exports, documents, and UI customization.

## Available Themes

### 1. Ocean Depths (Default for Professional)
```css
--primary: #1e3a5f;
--secondary: #2d5a87;
--accent: #4a90d9;
--background: #f0f5fa;
--text: #1a2a3a;
```
**Fonts**: Merriweather (headers), Open Sans (body)
**Use for**: Professional reports, parent communications

### 2. Forest Canopy (Natural/Calming)
```css
--primary: #2d5a3d;
--secondary: #4a8c5e;
--accent: #7bc47f;
--background: #f5f9f6;
--text: #1a2d1f;
```
**Fonts**: Playfair Display (headers), Lato (body)
**Use for**: Student-facing materials, certificates

### 3. Modern Minimalist (Clean/Tech)
```css
--primary: #2c3e50;
--secondary: #7f8c8d;
--accent: #3498db;
--background: #ffffff;
--text: #2c3e50;
```
**Fonts**: Roboto (headers), Roboto (body)
**Use for**: Digital exports, dashboards

### 4. Sunset Boulevard (Warm/Creative)
```css
--primary: #c0392b;
--secondary: #e74c3c;
--accent: #f39c12;
--background: #fdf6f0;
--text: #2c1810;
```
**Fonts**: Montserrat (headers), Source Sans Pro (body)
**Use for**: Creative materials, marketing

### 5. Tech Innovation (Bold/Modern)
```css
--primary: #6366f1;
--secondary: #8b5cf6;
--accent: #06b6d4;
--background: #0f172a;
--text: #f1f5f9;
```
**Fonts**: Inter (headers), Inter (body)
**Use for**: Dark mode exports, tech-savvy audience

## Applying Themes

### For PDF Reports

```python
from reportlab.lib import colors

THEMES = {
    'ocean': {
        'primary': colors.HexColor('#1e3a5f'),
        'secondary': colors.HexColor('#2d5a87'),
        'accent': colors.HexColor('#4a90d9'),
        'background': colors.HexColor('#f0f5fa'),
        'text': colors.HexColor('#1a2a3a'),
    },
    'forest': {
        'primary': colors.HexColor('#2d5a3d'),
        'secondary': colors.HexColor('#4a8c5e'),
        'accent': colors.HexColor('#7bc47f'),
        'background': colors.HexColor('#f5f9f6'),
        'text': colors.HexColor('#1a2d1f'),
    }
}

def apply_theme(theme_name='ocean'):
    return THEMES.get(theme_name, THEMES['ocean'])
```

### For Excel Exports

```python
from openpyxl.styles import PatternFill, Font

EXCEL_THEMES = {
    'ocean': {
        'header_fill': PatternFill(start_color='1e3a5f', fill_type='solid'),
        'header_font': Font(bold=True, color='FFFFFF'),
        'accent_fill': PatternFill(start_color='4a90d9', fill_type='solid'),
    },
    'forest': {
        'header_fill': PatternFill(start_color='2d5a3d', fill_type='solid'),
        'header_font': Font(bold=True, color='FFFFFF'),
        'accent_fill': PatternFill(start_color='7bc47f', fill_type='solid'),
    }
}
```

### For Tailwind/CSS

```typescript
// tailwind.config.ts theme extension
const themes = {
  ocean: {
    primary: '#1e3a5f',
    secondary: '#2d5a87',
    accent: '#4a90d9',
  },
  forest: {
    primary: '#2d5a3d',
    secondary: '#4a8c5e',
    accent: '#7bc47f',
  }
};
```

## Custom Theme Generator

Create a custom theme from a base color:

```typescript
import { generateRadixColors } from '@radix-ui/colors';

function generateTheme(baseHue: number) {
  return {
    primary: `hsl(${baseHue}, 50%, 30%)`,
    secondary: `hsl(${baseHue}, 40%, 45%)`,
    accent: `hsl(${baseHue + 30}, 60%, 55%)`,
    background: `hsl(${baseHue}, 20%, 97%)`,
    text: `hsl(${baseHue}, 30%, 15%)`,
  };
}

// Music-themed: warm amber
const musicTheme = generateTheme(35);
```

## Theme Selection Guide

| Context | Recommended Theme |
|---------|-------------------|
| Parent reports | Ocean Depths |
| Student certificates | Forest Canopy |
| Admin exports | Modern Minimalist |
| Marketing materials | Sunset Boulevard |
| Tech documentation | Tech Innovation |

## Font Pairing Resources

- Google Fonts: https://fonts.google.com
- Font pairing tool: https://fontpair.co
- System font stack for performance:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  ```
