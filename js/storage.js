// storage.js — API client for PHP/MySQL backend (v2)

const API_URL = 'api/interactions.php';

const Storage = {
  // In-memory count cache { channelId: count } for synchronous badge rendering
  _countCache: {},

  _updateCache(interactions) {
    this._countCache = {};
    interactions.forEach(i => {
      this._countCache[i.channelId] = (this._countCache[i.channelId] || 0) + 1;
    });
  },

  async getAll() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('getAll failed: ' + res.status);
    const data = await res.json();
    this._updateCache(data);
    return data;
  },

  async save(interaction) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interaction)
    });
    if (!res.ok) throw new Error('save failed: ' + res.status);
    const saved = await res.json();
    this._countCache[saved.channelId] = (this._countCache[saved.channelId] || 0) + 1;
    return saved;
  },

  async delete(id) {
    const res = await fetch(API_URL + '?id=' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('delete failed: ' + res.status);
  },

  async update(id, fields) {
    const res = await fetch(API_URL + '?id=' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    if (!res.ok) throw new Error('update failed: ' + res.status);
    return await res.json();
  },

  async getByChannel(channelId) {
    const res = await fetch(API_URL + '?channel_id=' + channelId);
    if (!res.ok) throw new Error('getByChannel failed: ' + res.status);
    const data = await res.json();
    this._countCache[channelId] = data.length;
    return data;
  },

  async export() {
    const data = await this.getAll();
    return JSON.stringify(data, null, 2);
  },

  async import(jsonString) {
    return false; // stub — not implemented in v2
  }
};
