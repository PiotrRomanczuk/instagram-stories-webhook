# 🔄 Update Vercel-Awesome-AI MCP Authentication

## Current Configuration (No Authentication ❌)

Your `vercel-awesome-ai` MCP server in `~/.claude.json` currently has:

```json
"vercel-awesome-ai": {
  "type": "http",
  "url": "https://mcp.vercel.com/piotrromanczuks-projects/marszal-arts"
}
```

**Problem**: No authentication headers = requests may fail or be rate-limited.

---

## ✅ Required Change: Add API Key Authentication

### Step 1: Get Vercel API Key

1. Visit https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `Claude Code MCP`
4. Scopes: Select these permissions:
   - ✅ Deployments (Read)
   - ✅ Projects (Read)
   - ✅ Logs (Read)
   - ✅ Analytics (Read, optional)
5. Click **"Create"**
6. **Copy the token immediately** (shown only once!)
7. Store in password manager

### Step 2: Update ~/.claude.json

Open `~/.claude.json` in your editor:

```bash
nano ~/.claude.json
# or
code ~/.claude.json
```

Find the section:
```json
"/home/piotr/Desktop/instagram-stories-webhook": {
  "mcpServers": {
    "vercel-awesome-ai": {
      "type": "http",
      "url": "https://mcp.vercel.com/piotrromanczuks-projects/marszal-arts"
    }
  }
}
```

**Change it to** (add `headers` with your API key):

```json
"/home/piotr/Desktop/instagram-stories-webhook": {
  "mcpServers": {
    "vercel-awesome-ai": {
      "type": "http",
      "url": "https://mcp.vercel.com/piotrromanczuks-projects/marszal-arts",
      "headers": {
        "X-API-Key": "your_vercel_api_key_here"
      }
    }
  }
}
```

**Replace** `your_vercel_api_key_here` with your actual Vercel API key from Step 1.

### Step 3: Verify JSON Syntax

Before saving, validate JSON syntax:

```bash
cat ~/.claude.json | jq '.' > /dev/null && echo "✅ Valid JSON" || echo "❌ JSON syntax error"
```

If error, fix the JSON (common issues: missing commas, quotes).

### Step 4: Restart Claude Code

```bash
# Exit current session
/exit
# or press Ctrl+D

# Start new session in project directory
cd /home/piotr/Desktop/instagram-stories-webhook
claude
```

### Step 5: Verify Connection

In Claude Code, run:
```
/mcp
```

You should see:
```
✅ vercel-awesome-ai (connected)
```

### Step 6: Test MCP Server

Try using a Vercel MCP tool:
```
"List my Vercel deployments for marszal-arts project"
```

Should return deployment list without authentication errors.

---

## 🔐 Security Notes

1. **Never commit `~/.claude.json` to git** (already ignored by default)
2. **API key is personal** - don't share with team members
3. **Rotate key every 3-6 months** - set calendar reminder
4. **Revoke immediately** if compromised

---

## 🐛 Troubleshooting

### "401 Unauthorized" Error

**Cause**: Invalid or expired API key

**Fix**:
1. Verify key in https://vercel.com/account/tokens
2. Check key hasn't been revoked
3. Generate new token if needed
4. Update `~/.claude.json` with new key
5. Restart Claude Code

### "MCP Server Connection Failed"

**Cause**: Typo in configuration or invalid JSON

**Fix**:
```bash
# Validate JSON syntax
cat ~/.claude.json | jq '.projects["/home/piotr/Desktop/instagram-stories-webhook"].mcpServers.vercel-awesome-ai'

# Should output:
# {
#   "type": "http",
#   "url": "https://mcp.vercel.com/...",
#   "headers": {
#     "X-API-Key": "..."
#   }
# }
```

### Still Not Working?

Check `~/.claude/logs/` for detailed error messages:

```bash
tail -f ~/.claude/logs/latest.log
```

Look for lines containing `vercel-awesome-ai` or `mcp`.

---

## 📚 References

- [Full MCP Authentication Guide](./MCP_SERVER_AUTHENTICATION.md)
- [Vercel MCP Documentation](https://vercel.com/docs/mcp/vercel-mcp)
- [Vercel API Tokens](https://vercel.com/account/tokens)

---

**Quick Summary**: Add `"headers": { "X-API-Key": "your_key" }` to vercel-awesome-ai config, restart Claude Code. Done! ✅
