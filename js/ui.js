// ui.js — управление интерфейсом

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const INTERACTION_TYPES = [
  { value: "messenger", label: "Чат", icon: "💬" },
  { value: "letter", label: "Письмо", icon: "✉️" },
  { value: "call", label: "Звонок", icon: "📞" },
  { value: "problem", label: "Проблема", icon: "⚠️" },
  { value: "other", label: "Другое", icon: "📝" },
];

const PRIORITIES = [
  { value: 'low',      label: 'Низкий',     cls: 'priority-low' },
  { value: 'normal',   label: 'Обычный',    cls: 'priority-normal' },
  { value: 'high',     label: 'Высокий',    cls: 'priority-high' },
  { value: 'critical', label: 'Критичный',  cls: 'priority-critical' }
];

const UI = {
  editingId: null,

  init() {
    this.populateSelects();
    this.bindSearch();
    this.bindModal();
  },

  populateSelects() {
    const typeSelect = document.getElementById('field-type');
    typeSelect.innerHTML = INTERACTION_TYPES
      .map(t => `<option value="${t.value}">${t.icon} ${t.label}</option>`)
      .join('');

    const prioritySelect = document.getElementById('field-priority');
    prioritySelect.innerHTML = PRIORITIES
      .map(p => `<option value="${p.value}"${p.value === 'normal' ? ' selected' : ''}>${p.label}</option>`)
      .join('');
  },

  // === СПИСОК КАНАЛОВ ===

  renderChannelList(channels) {
    const list = document.getElementById('channel-list');
    if (!channels.length) {
      list.innerHTML = '<div class="empty-state">Каналы не найдены</div>';
      return;
    }
    list.innerHTML = channels.map(ch => `
      <div class="channel-item" data-id="${ch.id}" onclick="App.selectChannel(${ch.id})">
        <span class="channel-name">${ch.channelname}</span>
        <span class="channel-count" id="count-${ch.id}">${this.getInteractionBadge(ch.id)}</span>
      </div>
    `).join('');
  },

  getInteractionBadge(channelId) {
    const count = Storage.getByChannel(channelId).length;
    return count > 0 ? `<span class="badge">${count}</span>` : '';
  },

  updateChannelBadge(channelId) {
    const el = document.getElementById(`count-${channelId}`);
    if (el) el.innerHTML = this.getInteractionBadge(channelId);
  },

  // === ПОИСК ===

  bindSearch() {
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');
    const clearBtn = document.getElementById('search-clear');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      clearBtn.classList.toggle('hidden', query.length === 0);
      UI.renderChannelList(App.searchChannels(query));

      if (query.length >= 2) {
        const results = App.searchChannels(query).slice(0, 8);
        if (results.length) {
          dropdown.innerHTML = results.map(ch => `
            <div class="dropdown-item"
              onclick="UI.selectFromDropdown(${ch.id}, '${ch.channelname.replace(/'/g, "\\'")}')">
              ${ch.channelname}
            </div>`).join('');
          dropdown.classList.remove('hidden');
        } else {
          dropdown.classList.add('hidden');
        }
      } else {
        dropdown.classList.add('hidden');
      }
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      dropdown.classList.add('hidden');
      UI.renderChannelList(App.searchChannels(''));
      searchInput.focus();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        dropdown.classList.add('hidden');
      }
    });
  },

  selectFromDropdown(channelId, channelName) {
    document.getElementById('search-input').value = channelName;
    document.getElementById('search-dropdown').classList.add('hidden');
    App.selectChannel(channelId);
  },

  // === ДЕТАЛЬНЫЙ ВИД КАНАЛА ===

  showChannelDetail(channel) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('channel-detail').classList.remove('hidden');
    document.getElementById('channel-title').textContent = channel.channelname;
    document.getElementById('channel-id').textContent = `ID: ${channel.id}`;

    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`.channel-item[data-id="${channel.id}"]`);
    if (active) {
      active.classList.add('active');
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  },

  showWelcomeScreen() {
    document.getElementById('channel-detail').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  },

  // === ТАБЛИЦА ВЗАИМОДЕЙСТВИЙ ===

  renderInteractions(interactions) {
    const container = document.getElementById('interactions-list');

    if (!interactions.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Взаимодействий пока нет</p>
          <p class="empty-hint">Нажмите «+ Добавить» чтобы записать первое</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <table class="interactions-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Тип</th>
            <th>Контакт</th>
            <th>Заметка</th>
            <th>Важность</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${interactions.map(i => this.renderRow(i)).join('')}
        </tbody>
      </table>`;
  },

  renderNote(note) {
    if (!note) return '—';
    const escaped = escapeHtml(note);
    const isLong = note.length > 300 || note.includes('\n');
    if (!isLong) return escaped;
    const summary = escapeHtml(note.replace(/\n.*/s, '').substring(0, 100));
    return `<details class="note-details">
      <summary class="note-summary">${summary}…</summary>
      <span class="note-full">${escaped.replace(/\n/g, '<br>')}</span>
    </details>`;
  },

  renderRow(i) {
    const type = INTERACTION_TYPES.find(t => t.value === i.type) || INTERACTION_TYPES[3];
    const priority = PRIORITIES.find(p => p.value === i.priority) || PRIORITIES[1];
    const date = new Date(i.date).toLocaleDateString('ru-RU');

    return `
      <tr class="interaction-row">
        <td class="col-date">${date}</td>
        <td class="col-type">
          <span class="type-badge type-${i.type}">${type.icon} ${type.label}</span>
        </td>
        <td class="col-contact">${escapeHtml(i.contact) || '—'}</td>
        <td class="col-note">${this.renderNote(i.note)}</td>
        <td class="col-priority">
          <span class="priority-dot ${priority.cls}"></span>${priority.label}
        </td>
        <td>
          <button class="btn-edit" onclick="App.editInteraction(${i.id})" title="Редактировать">✎</button>
          <button class="btn-delete" onclick="App.deleteInteraction(${i.id})" title="Удалить">✕</button>
        </td>
      </tr>`;
  },

  // === ПОСЛЕДНИЕ ВЗАИМОДЕЙСТВИЯ ===

  renderRecentInteractions(interactions) {
    const container = document.getElementById('recent-list');
    if (!container) return;

    if (!interactions.length) {
      container.innerHTML = '<div class="empty-state">Взаимодействий пока нет</div>';
      return;
    }

    container.innerHTML = interactions.map(i => {
      const type = INTERACTION_TYPES.find(t => t.value === i.type) || INTERACTION_TYPES[3];
      const date = new Date(i.date).toLocaleDateString('ru-RU');
      return `
        <div class="recent-item" onclick="App.selectChannel(${i.channelId})">
          <span class="recent-type">${type.icon}</span>
          <span class="recent-channel">${i.channelName}</span>
          <span class="recent-date">${date}</span>
          <span class="recent-note">${i.note ? i.note.substring(0, 50) + (i.note.length > 50 ? '…' : '') : ''}</span>
        </div>`;
    }).join('');
  },

  // === МОДАЛЬНОЕ ОКНО ===

  bindModal() {
    document.getElementById('btn-add').addEventListener('click', () => this.openModal());
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
    document.getElementById('form-interaction').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
    document.getElementById('field-date').valueAsDate = new Date();
  },

  openModal(interaction = null) {
    this.editingId = interaction ? interaction.id : null;
    document.getElementById('modal-title').textContent =
      interaction ? 'Редактировать взаимодействие' : 'Новое взаимодействие';

    document.getElementById('form-interaction').reset();
    document.getElementById('field-date').valueAsDate = new Date();

    document.getElementById('modal-overlay').classList.remove('hidden');

    if (interaction) {
      document.getElementById('field-type').value     = interaction.type;
      document.getElementById('field-date').value     = interaction.date;
      document.getElementById('field-contact').value  = interaction.contact || '';
      document.getElementById('field-note').value     = interaction.note || '';
      document.getElementById('field-priority').value = interaction.priority;
    }

    setTimeout(() => document.getElementById('field-contact').focus(), 50);
  },

  closeModal() {
    this.editingId = null;
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('form-interaction').reset();
    document.getElementById('field-date').valueAsDate = new Date();
  },

  submitForm() {
    const formData = {
      type:     document.getElementById('field-type').value,
      date:     document.getElementById('field-date').value,
      contact:  document.getElementById('field-contact').value.trim(),
      note:     document.getElementById('field-note').value.trim(),
      priority: document.getElementById('field-priority').value
    };
    if (this.editingId) {
      App.updateInteraction(this.editingId, formData);
    } else {
      App.addInteraction(formData);
    }
  },

  // === TOAST ===

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2500);
  }
};
