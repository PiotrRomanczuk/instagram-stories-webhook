# Atlassian Remote MCP Server Setup

## Overview

The Atlassian Rovo MCP Server provides secure, real-time access to your Atlassian Cloud data (Jira, Confluence, Compass) directly from Claude Code. It uses OAuth 2.1 authentication and respects your existing user permissions.

## Configuration

Added to `.mcp.json`:

```json
{
  "atlassian": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/mcp"]
  }
}
```

## Prerequisites

- **Node.js v18+** (required for `mcp-remote` proxy)
- **Atlassian Cloud account** with access to Jira, Confluence, and/or Compass
- **Modern web browser** for OAuth authentication flow

## First-Time Setup

1. **Restart Claude Code** after updating `.mcp.json`
2. **Trigger authentication** by attempting to use any Atlassian tool
3. **Complete OAuth flow** in your browser when prompted
4. **Grant permissions** to access your Atlassian Cloud site

The `mcp-remote` proxy will:
- Launch a browser window for OAuth 2.1 authentication
- Store your session securely
- Handle token refresh automatically
- Respect your existing Atlassian permissions

## Available Capabilities

Once configured, you can:

### Jira
- Search and filter issues using JQL
- Create, update, and transition issues
- View issue details, comments, and attachments
- Manage sprints and backlogs
- Track development information (commits, PRs)

### Confluence
- Search pages and spaces
- Read and create documentation
- Summarize long-form content
- Extract information from wikis

### Compass
- Query service metadata
- View component relationships
- Access architectural documentation

## Example Use Cases for Guitar CRM

1. **Linear ↔ Jira Sync**: Bridge Linear tickets with Jira issues for cross-team collaboration
2. **Documentation**: Pull Confluence pages into code documentation
3. **Issue Tracking**: Create Jira tickets directly from code comments or errors
4. **Sprint Planning**: Query Jira sprint data to inform development priorities

## Security Features

- **OAuth 2.1**: Industry-standard secure authentication
- **HTTPS/TLS 1.2+**: Encrypted data transmission
- **Permission Inheritance**: Only access data you can already see in Atlassian
- **Scoped Tokens**: Limited access based on granted permissions
- **IP Allowlisting**: Enterprise IP restrictions are honored

## Advanced Configuration

### Multi-Tenant Setup

To connect to multiple Atlassian sites:

```json
{
  "atlassian-site1": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/mcp", "--resource", "site1"]
  },
  "atlassian-site2": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/mcp", "--resource", "site2"]
  }
}
```

### HTTP Proxy Support

If behind a corporate proxy:

```json
{
  "atlassian": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/mcp", "--enable-proxy"],
    "env": {
      "HTTP_PROXY": "http://proxy.company.com:8080",
      "HTTPS_PROXY": "http://proxy.company.com:8080"
    }
  }
}
```

### Ignore Specific Tools

To filter out unwanted tools:

```json
{
  "atlassian": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote",
      "https://mcp.atlassian.com/v1/mcp",
      "--ignore-tool",
      "confluence_*"
    ]
  }
}
```

## Troubleshooting

### Authentication Issues
- Ensure you're logged into Atlassian Cloud in your default browser
- Clear browser cookies for `atlassian.com` and retry
- Check that your Atlassian admin hasn't restricted OAuth apps

### Connection Errors
- Verify Node.js v18+ is installed: `node --version`
- Check internet connectivity to `mcp.atlassian.com`
- Review corporate firewall/proxy settings

### Permission Denied
- Your Atlassian user must have appropriate permissions
- The MCP server respects Jira/Confluence/Compass role-based access
- Contact your Atlassian admin to verify permissions

## Resources

- [Official Setup Guide](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/)
- [IDE Configuration](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/)
- [GitHub Repository](https://github.com/atlassian/atlassian-mcp-server)
- [mcp-remote npm package](https://www.npmjs.com/package/mcp-remote)

---

**Note**: This integration is optional for Guitar CRM development. Enable it if you need to interact with Atlassian services from Claude Code.
