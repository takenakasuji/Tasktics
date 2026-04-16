const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskticsBridge', {
  getVersion:     () => ipcRenderer.invoke('app:version'),
  loadData:       () => ipcRenderer.invoke('tasks:load'),
  saveData:       (payload) => ipcRenderer.invoke('tasks:save', payload),
  loadMilestones: () => ipcRenderer.invoke('milestones:load'),
  saveMilestones: (payload) => ipcRenderer.invoke('milestones:save', payload),
});
