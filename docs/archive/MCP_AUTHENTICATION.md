# 🔐 MCP Server Authentication Guide

## ⚠️ CRITICAL: Always Use API Key Authentication

**For all MCP servers, ALWAYS prefer API key authentication over OAuth/redirect-based authentication.**

### Why API Keys Are Mandatory

When working via SSH (remote development), OAuth redirect flows fail because:

1. **Localhost Redirects Break**: OAuth redirects to `http://localhost:port` which doesn't work in SSH sessions
2. **Port Forwarding Issues**: Even with port forwarding, timing and security issues arise
3. **Session Persistence**: API keys persist across sessions; OAuth tokens may expire mid-work
4. **CI/CD Compatibility**: Automation requires non-interactive authentication
5. **Multi-Project Stability**: API keys work consistently across all projects

### Authentication Pattern

All MCP servers in `~/.claude.json` should use the `headers` authentication pattern:

```json
{
  "mcpServers": {
    "server-name": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "X-API-Key": "your_api_key_here"
      }
    }
  }
}
```

---

## 📚 MCP Server Configuration Examples

### Vercel MCP Server

**Authentication**: `X-API-Key` header

```json
{
  "vercel": {
    "type": "http",
    "url": "https://mcp.vercel.com/mcp",
    "headers": {
      "X-API-Key": "your_vercel_api_key"
    }
  }
}
```

**Project-Specific Vercel MCP:**
```json
{
  "vercel-awesome-ai": {
    "type": "http",
    "url": "https://mcp.vercel.com/your-team/your-project",
    "headers": {
      "X-API-Key": "your_vercel_api_key"
    }
  }
}
```

**Getting Your Vercel API Key:**
1. Visit https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it "Claude Code MCP"
4. Select appropriate scopes (deployments, projects, logs)
5. Copy the token immediately (shown only once)

**Setting MCP API Key on Vercel Deployment:**
Set the `MCP_API_KEY` environment variable in your Vercel project settings for server-side validation.

**Documentation**: [Vercel MCP Authentication](https://vercel.com/docs/mcp/vercel-mcp)

---

### Google Stitch MCP Server

**Authentication**: `X-Goog-Api-Key` header

```json
{
  "stitch": {
    "type": "http",
    "url": "https://stitch.googleapis.com/mcp",
    "headers": {
      "X-Goog-Api-Key": "your_google_api_key"
    }
  }
}
```

**Getting Your Google Stitch API Key:**
1. Visit https://stitch.withgoogle.com/
2. Go to Settings → API Access
3. Generate new API key
4. Copy and store securely

**Documentation**: [Stitch MCP Setup](https://stitch.withgoogle.com/docs/mcp/setup)

---

### Supabase MCP Server

**Authentication**: API URL with project ref (key embedded in URL)

```json
{
  "supabase": {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp?project_ref=your_project_ref"
  }
}
```

**Alternative with Headers:**
```json
{
  "supabase": {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp",
    "headers": {
      "X-Supabase-Project": "your_project_ref",
      "Authorization": "Bearer your_supabase_service_role_key"
    }
  }
}
```

**Getting Supabase Credentials:**
1. Visit https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy Project Ref and Service Role Key (anon key for read-only)

---

### GitHub MCP Server

**Authentication**: `Authorization: Bearer` header

```json
{
  "github": {
    "type": "http",
    "url": "https://api.github.com/mcp",
    "headers": {
      "Authorization": "Bearer ghp_your_github_token",
      "Accept": "application/vnd.github+json"
    }
  }
}
```

**Getting GitHub Token:**
1. Visit https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`, `read:org`
4. Copy token immediately

---

### OpenAI MCP Server

**Authentication**: `Authorization: Bearer` header

```json
{
  "openai": {
    "type": "http",
    "url": "https://api.openai.com/mcp",
    "headers": {
      "Authorization": "Bearer sk-your_openai_api_key",
      "OpenAI-Beta": "mcp-v1"
    }
  }
}
```

**Getting OpenAI API Key:**
1. Visit https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy key immediately

---

### Anthropic Claude API MCP Server

**Authentication**: `x-api-key` header

```json
{
  "anthropic": {
    "type": "http",
    "url": "https://api.anthropic.com/mcp",
    "headers": {
      "x-api-key": "sk-ant-your_anthropic_key",
      "anthropic-version": "2023-06-01"
    }
  }
}
```

**Getting Anthropic API Key:**
1. Visit https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy key immediately

---

## 🚫 Avoid STDIO MCP Servers with OAuth

Some MCP packages use `stdio` type with `npx` commands that trigger OAuth flows:

```json
// ❌ AVOID: OAuth redirect issues in SSH
{
  "server-name": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "some-mcp-package", "auth", "--login"]
  }
}
```

**Instead**: Use HTTP MCP servers with API key headers (shown above).

---

## 🔧 Configuration File Location

MCP servers are configured in:

### Global Configuration
**File**: `~/.claude.json`

```json
{
  "mcpServers": {
    "vercel": { ... },
    "stitch": { ... }
  }
}
```

### Project-Specific Configuration
**File**: `~/.claude.json` → `projects` → `{project_path}` → `mcpServers`

```json
{
  "projects": {
    "/path/to/project": {
      "mcpServers": {
        "vercel-awesome-ai": { ... }
      }
    }
  }
}
```

**Avoid**: `.mcp.json` in project root (requires `enabledMcpjsonServers` config, more brittle)

---

## 🔐 Security Best Practices

### API Key Storage

1. **Never commit API keys to git**
   - Add `~/.claude.json` to `.gitignore` (already ignored by default)
   - Use environment-specific keys (dev vs prod)

2. **Use least-privilege scopes**
   - Vercel: Only grant necessary deployment/logs permissions
   - GitHub: Only grant required repo access
   - Supabase: Use anon key for read-only, service role for writes

3. **Rotate keys regularly**
   - Set calendar reminders (quarterly)
   - Revoke old keys after rotation

4. **Per-project keys**
   - Use different API keys for different projects
   - Easier to revoke compromised keys without affecting all projects

### Key Rotation Workflow

```bash
# 1. Generate new API key from provider
# 2. Update ~/.claude.json with new key
# 3. Restart Claude Code session
# 4. Verify MCP server connects: `/mcp`
# 5. Revoke old key from provider dashboard
```

---

## 🧪 Testing MCP Authentication

### Verify Server Configuration

```bash
# Check if server is configured
cat ~/.claude.json | jq '.projects["/path/to/project"].mcpServers'

# Or for global servers
cat ~/.claude.json | jq '.mcpServers'
```

### Test API Key Validity

**Vercel:**
```bash
curl -H "X-API-Key: your_key" https://mcp.vercel.com/mcp
# Expected: 405 Method Not Allowed (endpoint exists, but needs POST)
```

**Stitch:**
```bash
curl -H "X-Goog-Api-Key: your_key" https://stitch.googleapis.com/mcp
# Expected: 405 Method Not Allowed
```

**If 401 Unauthorized**: API key is invalid or expired

### Check MCP Server Status in Claude Code

```
/mcp
```

Should list all connected MCP servers with green checkmarks.

---

## 🐛 Troubleshooting

### "MCP Server Connection Failed"

**Cause**: Invalid API key or missing headers

**Fix**:
1. Verify API key is still valid in provider dashboard
2. Check headers match provider's expected format
3. Test with `curl` (see Testing section)
4. Restart Claude Code after config changes

### "Redirect to localhost failed"

**Cause**: Using OAuth-based STDIO MCP server

**Fix**: Switch to HTTP MCP server with API key headers (see examples above)

### "Environment variable MCP_API_KEY not set"

**This is SERVER-SIDE validation** (not your Claude Code config).

**Fix**: In Vercel/provider dashboard, set `MCP_API_KEY` environment variable for your deployment.

### MCP Server Not Loading

```bash
# 1. Verify config syntax
cat ~/.claude.json | jq '.projects'

# 2. Check for JSON errors (should output parsed JSON)
# If error, fix JSON syntax in ~/.claude.json

# 3. Restart Claude Code
# Exit: /exit or Ctrl+D
# Start new session in project directory

# 4. Verify connection
/mcp
```

---

## 📖 Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Vercel MCP Authentication](https://vercel.com/docs/mcp/vercel-mcp)
- [Vercel MCP OAuth Support](https://vercel.com/changelog/oauth-support-added-to-mcp-adapter)
- [MCP Adapter Authorization](https://github.com/vercel/mcp-adapter#authorization)
- [Supabase MCP Server](https://supabase.com/docs/mcp)
- [Google Stitch MCP](https://stitch.withgoogle.com/docs/mcp)

---

## ✅ Checklist: Adding New MCP Server

- [ ] Obtain API key from provider dashboard
- [ ] Choose appropriate scopes/permissions (least privilege)
- [ ] Add to `~/.claude.json` with `headers` authentication
- [ ] Test API key validity with `curl`
- [ ] Restart Claude Code session
- [ ] Verify with `/mcp` command
- [ ] Test MCP server tools work correctly
- [ ] Document API key location (password manager)
- [ ] Set rotation reminder (3-6 months)

---

## 💡 Pro Tips

1. **Use Project-Specific Servers**: Configure MCP servers per-project in `~/.claude.json` → `projects` → `{path}` → `mcpServers` for better isolation

2. **Environment-Specific Keys**: Use different API keys for development vs production projects

3. **Key Naming Convention**: Name tokens clearly (e.g., "Claude Code MCP - Dev", "Claude Code MCP - Prod")

4. **Monitor Usage**: Check provider dashboards regularly for unexpected API usage (may indicate compromised key)

5. **Team Sharing**: Share provider account access, not API keys. Each developer gets their own key.

---

**Remember**: SSH + OAuth redirects = 💥. Always use API key headers! 🔑

---

**Last Updated**: 2026-02-05
**Status**: ✅ Production-Ready
