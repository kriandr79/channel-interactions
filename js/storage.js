// storage.js — управление данными в localStorage

const STORAGE_KEY = 'channel_interactions';

const Storage = {
  getAll() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(interaction) {
    const all = this.getAll();
    interaction.id = Date.now();
    interaction.createdAt = new Date().toISOString();
    all.unshift(interaction);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return interaction;
  },

  delete(id) {
    const all = this.getAll().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  update(id, fields) {
    const all = this.getAll();
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...fields };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  getByChannel(channelId) {
    return this.getAll().filter(i => i.channelId === channelId);
  },

  export() {
    return JSON.stringify(this.getAll(), null, 2);
  },

  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }
};
