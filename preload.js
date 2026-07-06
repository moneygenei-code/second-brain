const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getLogs: () => ipcRenderer.invoke('get-logs'),
    getRoadmap: () => ipcRenderer.invoke('get-roadmap'),
    runArchitect: () => ipcRenderer.invoke('run-architect'),
    onLogsUpdated: (callback) => ipcRenderer.on('logs-updated', callback)
});
