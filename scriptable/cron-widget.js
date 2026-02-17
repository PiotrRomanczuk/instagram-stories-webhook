// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: clock;

/**
 * Instagram Stories Webhook - Cron Status Widget
 *
 * Displays real-time cron job status, queue metrics, and system health on your iPhone.
 *
 * Setup Instructions:
 * 1. Install Scriptable from the App Store (https://scriptable.app)
 * 2. Open Scriptable and create a new script
 * 3. Paste this code into the script
 * 4. Update the configuration below:
 *    - API_BASE_URL: Your production URL (e.g., https://your-app.vercel.app)
 *    - API_KEY: Your API key from the developer dashboard
 * 5. Run the script in Scriptable to preview
 * 6. Add widget to home screen:
 *    - Long press on home screen → Add Widget → Scriptable
 *    - Select this script
 *    - Choose widget size (Small, Medium, or Large)
 *
 * Widget Sizes:
 * - Small: Status + queue count
 * - Medium: Full status + metrics + 24h stats (recommended)
 * - Large: All above + recent log entries
 *
 * Features:
 * - 🔄 Auto-refresh every 15-60 minutes (iOS controlled)
 * - 📊 Real-time cron job status
 * - 📋 Queue metrics (pending, processing, stuck posts)
 * - ✅ 24-hour success/failure statistics
 * - 🔍 Recent log entries (large widget only)
 * - 🎨 Beautiful gradient design with emojis
 *
 * Troubleshooting:
 * - Widget shows "Error loading data": Check API_KEY and API_BASE_URL
 * - Widget not updating: iOS controls refresh frequency, wait 15-60 minutes
 * - Shows "Unauthorized": Generate new API key in developer dashboard
 * - Shows "Insufficient permissions": Ensure API key has 'cron:read' scope
 */

// ==================== CONFIGURATION ====================
// Update these values with your own settings

const API_BASE_URL = "https://your-app.vercel.app"; // Replace with your production URL
const API_KEY = "sk_live_YOUR_API_KEY_HERE"; // Replace with your API key

// =======================================================

/**
 * Fetch cron status from API
 */
async function fetchCronStatus() {
  const url = `${API_BASE_URL}/api/mobile/cron-status`;
  const req = new Request(url);
  req.headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };
  req.timeoutInterval = 30;

  try {
    const response = await req.loadJSON();

    // Check for API errors
    if (response.error) {
      console.error('API Error:', response.error);
      return null;
    }

    return response;
  } catch (error) {
    console.error('Error fetching cron status:', error);
    return null;
  }
}

/**
 * Create small widget (status + queue count)
 */
function createSmallWidget(data) {
  const widget = new ListWidget();

  // Background gradient
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a1a2e"), new Color("#16213e")];
  gradient.locations = [0.0, 1.0];
  widget.backgroundGradient = gradient;
  widget.setPadding(12, 12, 12, 12);

  // Header
  const header = widget.addText("📊 Cron");
  header.textColor = Color.white();
  header.font = Font.boldSystemFont(14);
  widget.addSpacer(6);

  // Process job status
  const processJob = data.status.jobs.find(j => j.name === 'process');
  if (processJob) {
    const statusEmoji = processJob.lastStatus === 'success' ? '✅' : '❌';
    const statusText = widget.addText(statusEmoji);
    statusText.font = Font.systemFont(20);

    widget.addSpacer(4);

    const nextLine = widget.addText(`Next: ${processJob.nextRunCountdown}`);
    nextLine.textColor = Color.gray();
    nextLine.font = Font.systemFont(10);
  }

  widget.addSpacer(6);

  // Queue count
  const queueText = widget.addText(`${data.metrics.postsInQueue}`);
  queueText.textColor = Color.white();
  queueText.font = Font.boldSystemFont(24);

  const queueLabel = widget.addText("in queue");
  queueLabel.textColor = Color.gray();
  queueLabel.font = Font.systemFont(10);

  return widget;
}

/**
 * Create medium widget (full status + metrics)
 */
function createMediumWidget(data) {
  const widget = new ListWidget();

  // Background gradient
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a1a2e"), new Color("#16213e")];
  gradient.locations = [0.0, 1.0];
  widget.backgroundGradient = gradient;
  widget.setPadding(16, 16, 16, 16);

  // Header
  const header = widget.addText("📊 Cron Status");
  header.textColor = Color.white();
  header.font = Font.boldSystemFont(16);
  widget.addSpacer(10);

  // Process job status
  const processJob = data.status.jobs.find(j => j.name === 'process');
  if (processJob) {
    const statusEmoji = processJob.lastStatus === 'success' ? '✅' : '❌';
    const statusLine = widget.addText(`${statusEmoji} ${processJob.lastMessage}`);
    statusLine.textColor = Color.white();
    statusLine.font = Font.systemFont(12);
    statusLine.lineLimit = 1;

    const timeLine = widget.addText(`Last: ${processJob.lastRunRelative}`);
    timeLine.textColor = Color.gray();
    timeLine.font = Font.systemFont(10);

    const nextLine = widget.addText(`Next: ${processJob.nextRunCountdown}`);
    nextLine.textColor = Color.gray();
    nextLine.font = Font.systemFont(10);
  }

  widget.addSpacer(10);

  // Metrics row 1
  const metricsRow1 = widget.addStack();
  metricsRow1.layoutHorizontally();

  const queueStack = metricsRow1.addStack();
  queueStack.layoutVertically();
  const queueText = queueStack.addText(`📋 ${data.metrics.postsInQueue}`);
  queueText.textColor = Color.white();
  queueText.font = Font.systemFont(12);
  const queueLabel = queueStack.addText("Queue");
  queueLabel.textColor = Color.gray();
  queueLabel.font = Font.systemFont(9);

  metricsRow1.addSpacer();

  const processingStack = metricsRow1.addStack();
  processingStack.layoutVertically();
  const processingText = processingStack.addText(`⚙️ ${data.metrics.postsProcessing}`);
  processingText.textColor = Color.white();
  processingText.font = Font.systemFont(12);
  const processingLabel = processingStack.addText("Processing");
  processingLabel.textColor = Color.gray();
  processingLabel.font = Font.systemFont(9);

  if (data.metrics.postsStuck > 0) {
    metricsRow1.addSpacer();

    const stuckStack = metricsRow1.addStack();
    stuckStack.layoutVertically();
    const stuckText = stuckStack.addText(`⚠️ ${data.metrics.postsStuck}`);
    stuckText.textColor = Color.orange();
    stuckText.font = Font.systemFont(12);
    const stuckLabel = stuckStack.addText("Stuck");
    stuckLabel.textColor = Color.gray();
    stuckLabel.font = Font.systemFont(9);
  }

  widget.addSpacer(10);

  // 24h stats
  const statsText = widget.addText("Last 24 hours:");
  statsText.textColor = Color.gray();
  statsText.font = Font.boldSystemFont(10);
  widget.addSpacer(4);

  const publishedText = widget.addText(`✅ Published: ${data.metrics.publishedLast24h}`);
  publishedText.textColor = Color.green();
  publishedText.font = Font.systemFont(11);

  if (data.metrics.failedLast24h > 0) {
    const failedText = widget.addText(`❌ Failed: ${data.metrics.failedLast24h}`);
    failedText.textColor = Color.red();
    failedText.font = Font.systemFont(11);

    const errorRateText = widget.addText(`📉 Error rate: ${data.metrics.errorRate}%`);
    errorRateText.textColor = Color.orange();
    errorRateText.font = Font.systemFont(11);
  }

  widget.addSpacer();

  // Refresh timestamp
  const timestamp = widget.addText(`Updated: ${new Date().toLocaleTimeString()}`);
  timestamp.textColor = Color.darkGray();
  timestamp.font = Font.systemFont(8);

  return widget;
}

/**
 * Create large widget (full status + metrics + recent logs)
 */
function createLargeWidget(data) {
  const widget = new ListWidget();

  // Background gradient
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a1a2e"), new Color("#16213e")];
  gradient.locations = [0.0, 1.0];
  widget.backgroundGradient = gradient;
  widget.setPadding(16, 16, 16, 16);

  // Header
  const header = widget.addText("📊 Cron Status & Logs");
  header.textColor = Color.white();
  header.font = Font.boldSystemFont(16);
  widget.addSpacer(8);

  // Process job status (compact)
  const processJob = data.status.jobs.find(j => j.name === 'process');
  if (processJob) {
    const statusEmoji = processJob.lastStatus === 'success' ? '✅' : '❌';
    const statusLine = widget.addText(`${statusEmoji} ${processJob.lastRunRelative} • Next: ${processJob.nextRunCountdown}`);
    statusLine.textColor = Color.white();
    statusLine.font = Font.systemFont(11);
    statusLine.lineLimit = 1;
  }

  widget.addSpacer(8);

  // Metrics (compact row)
  const metricsRow = widget.addStack();
  metricsRow.layoutHorizontally();

  const queueText = metricsRow.addText(`📋 ${data.metrics.postsInQueue}`);
  queueText.textColor = Color.white();
  queueText.font = Font.systemFont(11);

  metricsRow.addSpacer();

  const processingText = metricsRow.addText(`⚙️ ${data.metrics.postsProcessing}`);
  processingText.textColor = Color.white();
  processingText.font = Font.systemFont(11);

  metricsRow.addSpacer();

  const statsText = metricsRow.addText(`✅ ${data.metrics.publishedLast24h}/24h`);
  statsText.textColor = Color.green();
  statsText.font = Font.systemFont(11);

  if (data.metrics.failedLast24h > 0) {
    metricsRow.addSpacer();
    const failedText = metricsRow.addText(`❌ ${data.metrics.failedLast24h}`);
    failedText.textColor = Color.red();
    failedText.font = Font.systemFont(11);
  }

  widget.addSpacer(8);

  // Recent logs
  const logsHeader = widget.addText("Recent Logs:");
  logsHeader.textColor = Color.gray();
  logsHeader.font = Font.boldSystemFont(10);
  widget.addSpacer(4);

  const recentLogs = data.recentLogs.slice(0, 5); // Show 5 most recent
  for (const log of recentLogs) {
    const levelEmoji = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️';
    const logTime = new Date(log.created_at);
    const timeStr = logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const logText = widget.addText(`${levelEmoji} ${timeStr} ${log.message}`);
    logText.textColor = log.level === 'error' ? Color.red() : log.level === 'warn' ? Color.orange() : Color.gray();
    logText.font = Font.systemFont(9);
    logText.lineLimit = 1;
  }

  widget.addSpacer();

  // Refresh timestamp
  const timestamp = widget.addText(`Updated: ${new Date().toLocaleTimeString()}`);
  timestamp.textColor = Color.darkGray();
  timestamp.font = Font.systemFont(8);

  return widget;
}

/**
 * Create error widget
 */
function createErrorWidget(error) {
  const widget = new ListWidget();

  // Background gradient
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a1a2e"), new Color("#16213e")];
  gradient.locations = [0.0, 1.0];
  widget.backgroundGradient = gradient;
  widget.setPadding(16, 16, 16, 16);

  const errorText = widget.addText("❌ Error");
  errorText.textColor = Color.red();
  errorText.font = Font.boldSystemFont(16);

  widget.addSpacer(8);

  const messageText = widget.addText(error || "Failed to load data");
  messageText.textColor = Color.white();
  messageText.font = Font.systemFont(12);

  widget.addSpacer(8);

  const helpText = widget.addText("Check:\n• API_BASE_URL\n• API_KEY\n• Network connection");
  helpText.textColor = Color.gray();
  helpText.font = Font.systemFont(10);

  return widget;
}

/**
 * Main widget creation
 */
async function createWidget() {
  const data = await fetchCronStatus();

  if (!data) {
    return createErrorWidget("Failed to fetch data. Check configuration.");
  }

  // Determine widget size from config
  const widgetSize = config.widgetFamily || "medium";

  if (widgetSize === "small") {
    return createSmallWidget(data);
  } else if (widgetSize === "large") {
    return createLargeWidget(data);
  } else {
    // Default to medium
    return createMediumWidget(data);
  }
}

// ==================== MAIN EXECUTION ====================

if (config.runsInWidget) {
  // Running as widget
  const widget = await createWidget();
  Script.setWidget(widget);
} else {
  // Running in app (preview)
  const widget = await createWidget();

  // Show preview based on size
  if (config.widgetFamily === "small") {
    await widget.presentSmall();
  } else if (config.widgetFamily === "large") {
    await widget.presentLarge();
  } else {
    await widget.presentMedium();
  }
}

Script.complete();
