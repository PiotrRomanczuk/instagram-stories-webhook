#!/usr/bin/env python3
import subprocess
import argparse
import sys
from datetime import datetime, timedelta

# Default Settings
DEFAULT_AUTHORS = ['piotr', 'romanczuk', 'claude']
DEFAULT_SESSION_GAP_HOURS = 2.0
DEFAULT_SESSION_PADDING_MINUTES = 15.0

# Client Report Constants (v0.21.1)
CLIENT_DEV_ADJUSTMENT = 10.00
CLIENT_DOCS_ADJUSTMENT = 6.59

def get_commits(authors=None, start_date=None, end_date=None):
    if authors is None:
        authors = DEFAULT_AUTHORS
        
    # Use --reflog to catch everything including lost branches
    cmd = ['git', 'log', '--all', '--reflog', '--pretty=format:%an|%ai']
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running git command: {e}")
        sys.exit(1)
        
    lines = result.stdout.strip().split('\n')
    
    commits = []
    seen = set()
    
    for line in lines:
        if not line or line in seen: continue
        seen.add(line)
        
        try:
            author, date_str = line.split('|', 1)
            # Normalize date string (remove timezone offset for simpler calculation if needed, 
            # or keep it. Here we parse widely compatible format)
            # %ai example: 2026-02-18 22:31:15 +0100
            # We take the first two parts: YYYY-MM-DD HH:MM:SS
            dt_str = date_str.split(' ')[0] + ' ' + date_str.split(' ')[1]
            dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
            
            # Filter by Date
            if start_date and dt < start_date:
                continue
            if end_date and dt > end_date:
                continue
                
            # Filter by Author
            author_lower = author.lower()
            if any(name in author_lower for name in authors):
                commits.append(dt)
                
        except Exception:
            continue
            
    commits.sort()
    return commits

def calculate_sessions(commits, gap_hours=DEFAULT_SESSION_GAP_HOURS):
    if not commits:
        return []
        
    sessions = []
    current_session = [commits[0]]
    
    for i in range(1, len(commits)):
        gap = commits[i] - commits[i-1]
        if gap > timedelta(hours=gap_hours):
            sessions.append(current_session)
            current_session = [commits[i]]
        else:
            current_session.append(commits[i])
            
    sessions.append(current_session)
    return sessions

def analyze_work(sessions, padding_minutes=DEFAULT_SESSION_PADDING_MINUTES):
    total_seconds = 0
    detailed_lines = []
    
    stats = {
        'total_sessions': len(sessions),
        'longest_session': timedelta(0),
        'total_commits': sum(len(s) for s in sessions),
        'active_days': set()
    }
    
    for i, session in enumerate(sessions):
        first = session[0]
        last = session[-1]
        raw_duration = last - first
        padded_duration = raw_duration + timedelta(minutes=padding_minutes)
        
        total_seconds += padded_duration.total_seconds()
        
        if raw_duration > stats['longest_session']:
            stats['longest_session'] = raw_duration
            
        stats['active_days'].add(first.date())
        
        line = (f"Session {i+1}: {first.strftime('%Y-%m-%d %H:%M')} -> {last.strftime('%H:%M')} "
                f"({len(session)} commits) | "
                f"Raw: {raw_duration} + {int(padding_minutes)}m = {padded_duration}")
        detailed_lines.append(line)
        
    total_hours = total_seconds / 3600.0
    return total_hours, detailed_lines, stats

def main():
    parser = argparse.ArgumentParser(description="Calculate working hours from git history.")
    parser.add_argument('--authors', '-a', nargs='+', default=DEFAULT_AUTHORS, help='List of author substrings to match')
    parser.add_argument('--gap', '-g', type=float, default=DEFAULT_SESSION_GAP_HOURS, help='Gap in hours to define new session')
    parser.add_argument('--padding', '-p', type=float, default=DEFAULT_SESSION_PADDING_MINUTES, help='Minutes added to each session start')
    parser.add_argument('--client-report', action='store_true', default=True, help='Enable Client Report adjustments (default: True)')
    parser.add_argument('--no-client-report', action='store_false', dest='client_report', help='Disable Client Report adjustments')
    parser.add_argument('--start', type=str, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end', type=str, help='End date (YYYY-MM-DD)')
    parser.add_argument('--output', '-o', default='docs/hours-reports/detailed_report_latest.md', help='Output markdown file path')

    args = parser.parse_args()
    
    # Parse dates if provided
    start_date = datetime.strptime(args.start, '%Y-%m-%d') if args.start else None
    end_date = datetime.strptime(args.end, '%Y-%m-%d') + timedelta(days=1) - timedelta(seconds=1) if args.end else None

    print(f"🔍 Analyzing git history for authors: {', '.join(args.authors)}...")
    commits = get_commits(args.authors, start_date, end_date)
    
    if not commits:
        print("❌ No matching commits found.")
        return

    sessions = calculate_sessions(commits, args.gap)
    base_hours, report_lines, stats = analyze_work(sessions, args.padding)
    
    # adjustments logic
    dev_total = base_hours
    final_total = base_hours
    
    if args.client_report:
        dev_total += CLIENT_DEV_ADJUSTMENT
        final_total = dev_total + CLIENT_DOCS_ADJUSTMENT
        
    # --- Console Output ---
    print("\n" + "="*50)
    print(f" 📊 WORK HOURS REPORT")
    print("="*50)
    print(f" Total Commits:      {stats['total_commits']}")
    print(f" Total Sessions:     {stats['total_sessions']}")
    print(f" Active Days:        {len(stats['active_days'])}")
    print(f" Longest Session:    {stats['longest_session']}")
    print("-" * 50)
    print(f" ⏱️  Git-Tracked Hours: {base_hours:.2f} h")
    
    if args.client_report:
        print(f" ➕ Dev Adjustment:    +{CLIENT_DEV_ADJUSTMENT:.2f} h")
        print(f" 📝 Docs Adjustment:   +{CLIENT_DOCS_ADJUSTMENT:.2f} h")
        print("-" * 50)
        print(f" 🏁 TOTAL CLIENT HOURS: {final_total:.2f} h")
    else:
        print("-" * 50)
        print(f" 🏁 TOTAL HOURS:       {base_hours:.2f} h")
    print("="*50)

    # --- File Output ---
    with open(args.output, 'w') as f:
        f.write(f"# Work Hours Report\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Parameters**: Gap={args.gap}h, Padding={args.padding}m\n\n")
        
        f.write("## 📈 Summary\n\n")
        if args.client_report:
           f.write(f"| Category | Hours |\n")
           f.write(f"|---|---|\n")
           f.write(f"| **Development & Integration** | **{dev_total:.2f}** |\n")
           f.write(f"| &nbsp;&nbsp;↳ Git-Tracked Code | {base_hours:.2f} |\n")
           f.write(f"| &nbsp;&nbsp;↳ System Integration | {CLIENT_DEV_ADJUSTMENT:.2f} |\n")
           f.write(f"| **Documentation & Release** | **{CLIENT_DOCS_ADJUSTMENT:.2f}** |\n")
           f.write(f"| **TOTAL BILLABLE** | **{final_total:.2f}** |\n\n")
        else:
           f.write(f"- **Total Hours**: {base_hours:.2f}\n")
           
        f.write("## 📊 Statistics\n\n")
        f.write(f"- **Commits**: {stats['total_commits']}\n")
        f.write(f"- **Sessions**: {stats['total_sessions']}\n")
        f.write(f"- **Active Days**: {len(stats['active_days'])}\n")
        
        f.write("\n## 🕒 Session Log\n\n")
        for line in report_lines:
            f.write(f"- {line}\n")
            
    print(f"\n✅ Detailed report saved to: {args.output}")

if __name__ == "__main__":
    main()
