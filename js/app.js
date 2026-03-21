// app.js — основная логика

const App = {
  channels: [],
  currentChannel: null,

  async init() {
    await this.loadChannels();
    UI.init();
    UI.renderChannelList(this.channels);
    this.renderRecentInteractions();
  },

  async loadChannels() {
    try {
      const response = await fetch('data/channels.json');
      this.channels = await response.json();
    } catch (e) {
      console.error('Ошибка загрузки channels.json:', e);
      this.channels = [];
    }
  },

  searchChannels(query) {
    if (!query) return this.channels;
    const q = query.toLowerCase();
    return this.channels.filter(ch => ch.channelname.toLowerCase().includes(q));
  },

  selectChannel(channelId) {
    // channelId приходит как number из onclick
    this.currentChannel = this.channels.find(ch => ch.id === channelId);
    if (this.currentChannel) {
      UI.showChannelDetail(this.currentChannel);
      UI.renderInteractions(Storage.getByChannel(channelId));
    }
  },

  addInteraction(formData) {
    if (!this.currentChannel) return;

    Storage.save({
      channelId:   this.currentChannel.id,
      channelName: this.currentChannel.channelname,
      type:        formData.type,
      date:        formData.date,
      contact:     formData.contact,
      note:        formData.note,
      priority:    formData.priority
    });

    UI.renderInteractions(Storage.getByChannel(this.currentChannel.id));
    UI.updateChannelBadge(this.currentChannel.id);
    UI.closeModal();
    UI.showToast('Взаимодействие сохранено');
    this.renderRecentInteractions();
  },

  deleteInteraction(id) {
    Storage.delete(id);
    if (this.currentChannel) {
      UI.renderInteractions(Storage.getByChannel(this.currentChannel.id));
      UI.updateChannelBadge(this.currentChannel.id);
    }
    this.renderRecentInteractions();
    UI.showToast('Удалено');
  },

  renderRecentInteractions() {
    UI.renderRecentInteractions(Storage.getAll().slice(0, 10));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
