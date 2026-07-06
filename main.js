const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDb, db } = require('./database');
const { startSync } = require('./syncEngine');
const { architectAgent } = require('./agents/architectAgent');
const { logToSecondBrain, getAllLogs } = require('./secondBrain');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000'
  });

  // In a real dev env we'd load from localhost:3000
  // For this prototype, we'll load a static HTML file
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  initDb();
  startSync();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for the "Command Center"
ipcMain.handle('get-logs', async () => {
  return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100').all();
});

ipcMain.handle('get-roadmap', async () => {
  return db.prepare('SELECT * FROM roadmap ORDER BY id DESC').all();
});

ipcMain.handle('run-architect', async () => {
  const logs = await getAllLogs();
  const prompt = architectAgent.buildPrompt({}, { logs });

  // Mocking the AI response for the prototype
  const mockResponse = JSON.stringify({
    agent: "Architect",
    headline: "Architectural Analysis & Future Plan",
    summary: "System performance is stable. Increased success in 'deal' type activities noted.",
    insights: [
      "Deals are 20% more successful when initiated by Agent Hermes.",
      "Logging latency is minimal."
    ],
    future_plan: [
      "Step 1: Implement real-time dashboard (In Progress)",
      "Step 2: Add Vector Search for memory scaling",
      "Step 3: Integrate Hermes for strategic deal hunting"
    ],
    recommendedNext: "Share this plan with Hermes to update the global strategy."
  });

  const parsed = architectAgent.parseResponse(mockResponse);

  // Log the architect's run to the second brain
  await logToSecondBrain({
    agentId: 'architect',
    agentName: 'Architect',
    type: 'activity',
    status: 'success',
    data: parsed
  });

  return parsed;
});
