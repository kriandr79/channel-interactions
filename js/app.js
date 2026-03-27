// app.js — основная логика

const App = {
  channels: [],
  currentChannel: null,

  async init() {
    await this.loadChannels();
    await this.renderRecentInteractions(); // warms Storage._countCache before renderChannelList
    UI.init();
    UI.renderChannelList(this.channels);
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

  async selectChannel(channelId) {
    this.currentChannel = this.channels.find(ch => ch.id === channelId);
    if (!this.currentChannel) return;
    try {
      const interactions = await Storage.getByChannel(channelId);
      UI.showChannelDetail(this.currentChannel);
      UI.renderInteractions(interactions);
    } catch (e) {
      console.error('selectChannel error:', e);
      UI.showToast('Ошибка загрузки взаимодействий');
    }
  },

  async addInteraction(formData) {
    if (!this.currentChannel) return;
    try {
      await Storage.save({
        channelId:   this.currentChannel.id,
        channelName: this.currentChannel.channelname,
        type:        formData.type,
        date:        formData.date,
        contact:     formData.contact,
        note:        formData.note,
        priority:    formData.priority
      });
      const interactions = await Storage.getByChannel(this.currentChannel.id);
      UI.renderInteractions(interactions);
      UI.updateChannelBadge(this.currentChannel.id);
      UI.closeModal();
      UI.showToast('Взаимодействие сохранено');
      this.renderRecentInteractions();
    } catch (e) {
      console.error('addInteraction error:', e);
      UI.showToast('Ошибка сохранения. Попробуйте снова.');
    }
  },

  async editInteraction(id) {
    try {
      const all = await Storage.getAll();
      const interaction = all.find(i => i.id === id);
      if (interaction) UI.openModal(interaction);
    } catch (e) {
      console.error('editInteraction error:', e);
      UI.showToast('Ошибка загрузки. Попробуйте снова.');
    }
  },

  async updateInteraction(id, formData) {
    try {
      await Storage.update(id, formData);
      if (this.currentChannel) {
        const interactions = await Storage.getByChannel(this.currentChannel.id);
        UI.renderInteractions(interactions);
        UI.updateChannelBadge(this.currentChannel.id);
      }
      UI.closeModal();
      UI.showToast('Взаимодействие обновлено');
      this.renderRecentInteractions();
    } catch (e) {
      console.error('updateInteraction error:', e);
      UI.showToast('Ошибка обновления. Попробуйте снова.');
    }
  },

  async deleteInteraction(id) {
    try {
      await Storage.delete(id);
      if (this.currentChannel) {
        const interactions = await Storage.getByChannel(this.currentChannel.id);
        UI.renderInteractions(interactions);
        UI.updateChannelBadge(this.currentChannel.id);
      }
      this.renderRecentInteractions();
      UI.showToast('Удалено');
    } catch (e) {
      console.error('deleteInteraction error:', e);
      UI.showToast('Ошибка удаления. Попробуйте снова.');
    }
  },

  goHome() {
    this.currentChannel = null;
    UI.showWelcomeScreen();
  },

  async renderRecentInteractions() {
    try {
      const all = await Storage.getAll();
      UI.renderRecentInteractions(all.slice(0, 10));
    } catch (e) {
      console.error('renderRecentInteractions error:', e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
