# 🎨 Stitch MCP Integration Guide

## ✅ Setup Complete!

Your Stitch MCP server is now configured and ready to use!

## 📍 Configuration Location

- **File**: `~/.claude.json` (user-level config)
- **Project**: `/home/piotr/Desktop/instagram-stories-webhook`
- **Section**: `projects[project_path].mcpServers.stitch`
- **Type**: HTTP MCP Server
- **Endpoint**: `https://stitch.googleapis.com/mcp`
- **Authentication**: API Key (stored in `~/.claude.json`)

## 🔧 Available Tools

Once Claude Code reloads, you'll have access to these Stitch tools:

### Design Analysis
- `extract_design_context` - Extract typography, colors, and layout patterns from screens
- `fetch_screen_image` - Download high-resolution screenshots
- `fetch_screen_code` - Get HTML/CSS code for screens

### Content Generation
- `generate_screen_from_text` - Create new screens from text descriptions

### Project Management
- `list_projects` - List all your Stitch projects
- `get_project` - Get project details
- `create_project` - Create new projects

### Screen Management
- `list_screens` - List screens in a project
- `get_screen` - Get screen information

## 🚀 How to Use

### 1. Restart Claude Code
The MCP server will be automatically loaded on next startup.

### 2. Test the Connection
Try asking:
```
"List my Stitch projects"
"Show me screens in project [project-name]"
```

### 3. Example Workflows

#### Extract Design System
```
1. "Extract design context from screen [screen-id] in project [project-name]"
2. Use extracted context to generate consistent designs
```

#### Generate New Screen
```
"Generate a new screen with a login form using Material Design principles"
```

#### Get Screen Code
```
"Fetch the HTML code for screen [screen-id] in project [project-name]"
```

## 🔐 Security

- ✅ API key stored in `~/.claude.json` (not committed to git)
- ✅ Project-scoped configuration in user config file
- ✅ HTTP authentication headers

**Note**: `.mcp.json` files in project root require additional setup (`enabledMcpjsonServers`). Direct configuration in `~/.claude.json` is simpler and more reliable.

## 🐛 Troubleshooting

### MCP Server Not Loading
```bash
# Check if stitch server is configured
cat ~/.claude.json | jq '.projects["/home/piotr/Desktop/instagram-stories-webhook"].mcpServers.stitch'

# Verify it returns the server configuration
```

### Test API Key
```bash
# MCP uses POST, so GET will return 405 (expected)
curl -H "X-Goog-Api-Key: YOUR_KEY" https://stitch.googleapis.com/mcp
# 405 Method Not Allowed = endpoint exists ✅
```

### Restart Required
After creating/modifying `~/.claude.json`, you need to:
1. **Exit current Claude Code session** (`/exit` or Ctrl+D)
2. **Start a new session** in this directory
3. **Verify with**: `/mcp` command to list connected servers

## 📚 Resources

- [Stitch Documentation](https://stitch.withgoogle.com/docs/mcp/setup)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Stitch MCP GitHub](https://github.com/Kargatharaakash/stitch-mcp)

## 💡 Pro Tips

1. **Designer Flow Pattern**: Extract design context first, then generate new screens using that context for consistency

2. **Team Sharing**: To share Stitch access with team (without exposing API key):
   - Create `.mcp.json.example` with placeholder
   - Document API key setup in README
   - Each team member uses their own API key

3. **Multiple Projects**: You can work with multiple Stitch projects simultaneously

## ⚠️ Important Notes

- API key is personal - don't share it
- `.mcp.json` is gitignored by default
- MCP servers are project-specific (this directory only)
- Restart Claude Code after config changes

---

**Status**: ✅ Configured and ready to use!
**Next Step**: Restart Claude Code and try `"List my Stitch projects"`
