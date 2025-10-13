// Scheduler/Calendar Module for Shiro Notes
class SchedulerModule {
  constructor(app) {
    this.app = app;
    this.currentDate = new Date();
    this.currentView = 'month';
    this.selectedDate = null;
    this.eventColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
  }

  init() {
    this.loadSchedulerPage();
    this.renderCalendar();
  }

  loadSchedulerPage() {
    const page = document.getElementById('schedulerPage');
    if (!page) return;

    page.innerHTML = `
      <div class="scheduler-container">
        <div class="scheduler-header">
          <div class="scheduler-nav">
            <button class="nav-btn" onclick="schedulerModule.previousPeriod()" title="Previous">
              <i class="fas fa-chevron-left"></i>
            </button>
            <h2 class="current-period" id="currentPeriod">${this.getCurrentPeriodText()}</h2>
            <button class="nav-btn" onclick="schedulerModule.nextPeriod()" title="Next">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          
          <div class="view-controls">
            <button class="view-btn ${this.currentView === 'day' ? 'active' : ''}" onclick="schedulerModule.setView('day')">
              <i class="fas fa-calendar-day"></i> Day
            </button>
            <button class="view-btn ${this.currentView === 'week' ? 'active' : ''}" onclick="schedulerModule.setView('week')">
              <i class="fas fa-calendar-week"></i> Week
            </button>
            <button class="view-btn ${this.currentView === 'month' ? 'active' : ''}" onclick="schedulerModule.setView('month')">
              <i class="fas fa-calendar"></i> Month
            </button>
          </div>
          
          <div class="scheduler-actions">
            <button class="btn btn--secondary btn--sm" onclick="schedulerModule.goToToday()">
              <i class="fas fa-calendar-day"></i> Today
            </button>
            <button class="btn btn--primary btn--sm" onclick="schedulerModule.createEvent()">
              <i class="fas fa-plus"></i> New Event
            </button>
          </div>
        </div>
        
        <div class="calendar-container">
          <div class="calendar-view" id="calendarView">
            <!-- Calendar will be rendered here -->
          </div>
        </div>
        
        <div class="events-sidebar" id="eventsSidebar">
          <h3>Upcoming Events</h3>
          <div class="upcoming-events" id="upcomingEvents">
            <!-- Upcoming events will be listed here -->
          </div>
        </div>
      </div>
    `;
  }

  setView(view) {
    this.currentView = view;
    
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.closest('.view-btn').classList.add('active');
    
    // Update period text
    document.getElementById('currentPeriod').textContent = this.getCurrentPeriodText();
    
    // Re-render calendar
    this.renderCalendar();
  }

  getCurrentPeriodText() {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    switch (this.currentView) {
      case 'day':
        return this.currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        const weekStart = this.getWeekStart(this.currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
      default:
        return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }
  }

  previousPeriod() {
    switch (this.currentView) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        break;
    }
    
    document.getElementById('currentPeriod').textContent = this.getCurrentPeriodText();
    this.renderCalendar();
  }

  nextPeriod() {
    switch (this.currentView) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        break;
    }
    
    document.getElementById('currentPeriod').textContent = this.getCurrentPeriodText();
    this.renderCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    document.getElementById('currentPeriod').textContent = this.getCurrentPeriodText();
    this.renderCalendar();
  }

  renderCalendar() {
    const container = document.getElementById('calendarView');
    if (!container) return;
    
    switch (this.currentView) {
      case 'day':
        this.renderDayView(container);
        break;
      case 'week':
        this.renderWeekView(container);
        break;
      case 'month':
      default:
        this.renderMonthView(container);
        break;
    }
    
    this.updateUpcomingEvents();
  }

  renderMonthView(container) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    let html = '<div class="month-view">';
    
    // Days of week header
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    html += '<div class="calendar-header">';
    daysOfWeek.forEach(day => {
      html += `<div class="day-header">${day}</div>`;
    });
    html += '</div>';
    
    // Calendar grid
    html += '<div class="calendar-grid">';
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day);
      const isToday = this.isToday(currentDay);
      const isSelected = this.isSelected(currentDay);
      const dayEvents = this.getEventsForDate(currentDay);
      
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                    onclick="schedulerModule.selectDate('${currentDay.toISOString()}')"
                    data-date="${currentDay.toISOString()}">`;
      html += `<span class="day-number">${day}</span>`;
      
      if (dayEvents.length > 0) {
        html += '<div class="day-events">';
        dayEvents.slice(0, 3).forEach(event => {
          html += `<div class="day-event" style="background-color: ${event.color}" title="${this.app.escapeHtml(event.title)}">
                    ${this.app.escapeHtml(event.title.substring(0, 15))}${event.title.length > 15 ? '...' : ''}
                  </div>`;
        });
        if (dayEvents.length > 3) {
          html += `<div class="more-events">+${dayEvents.length - 3} more</div>`;
        }
        html += '</div>';
      }
      
      html += '</div>';
    }
    
    html += '</div></div>';
    container.innerHTML = html;
  }

  renderWeekView(container) {
    const weekStart = this.getWeekStart(this.currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    let html = '<div class="week-view">';
    
    // Header with days
    html += '<div class="week-header">';
    html += '<div class="time-column-header">Time</div>';
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const isToday = this.isToday(day);
      
      html += `<div class="day-column-header ${isToday ? 'today' : ''}">`;
      html += `<div class="day-name">${day.toLocaleDateString('en-US', { weekday: 'short' })}</div>`;
      html += `<div class="day-date">${day.getDate()}</div>`;
      html += '</div>';
    }
    html += '</div>';
    
    // Time slots
    html += '<div class="week-body">';
    hours.forEach(hour => {
      html += '<div class="time-row">';
      html += `<div class="time-slot">${this.formatHour(hour)}</div>`;
      
      for (let day = 0; day < 7; day++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(currentDay.getDate() + day);
        currentDay.setHours(hour, 0, 0, 0);
        
        const hourEvents = this.getEventsForHour(currentDay);
        
        html += `<div class="day-slot" onclick="schedulerModule.createEventAt('${currentDay.toISOString()}')"
                      data-datetime="${currentDay.toISOString()}">`;
        
        hourEvents.forEach(event => {
          const duration = this.getEventDuration(event);
          html += `<div class="week-event" style="background-color: ${event.color}" 
                        onclick="event.stopPropagation(); schedulerModule.editEvent('${event.id}')"
                        title="${this.app.escapeHtml(event.title)}">`;
          html += `<div class="event-title">${this.app.escapeHtml(event.title)}</div>`;
          html += `<div class="event-time">${this.formatEventTime(event)}</div>`;
          html += '</div>';
        });
        
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    
    html += '</div>';
    container.innerHTML = html;
  }

  renderDayView(container) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = this.getEventsForDate(this.currentDate);
    
    let html = '<div class="day-view">';
    html += `<div class="day-header">
              <h3>${this.currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h3>
            </div>`;
    
    html += '<div class="day-schedule">';
    hours.forEach(hour => {
      const hourEvents = this.getEventsForHour(this.currentDate, hour);
      
      html += '<div class="hour-slot">';
      html += `<div class="hour-time">${this.formatHour(hour)}</div>`;
      html += `<div class="hour-content" onclick="schedulerModule.createEventAt('${new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate(), hour).toISOString()}')"
                    data-datetime="${new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate(), hour).toISOString()}">`;
      
      hourEvents.forEach(event => {
        html += `<div class="day-event" style="background-color: ${event.color}"
                      onclick="event.stopPropagation(); schedulerModule.editEvent('${event.id}')">`;
        html += `<div class="event-title">${this.app.escapeHtml(event.title)}</div>`;
        html += `<div class="event-time">${this.formatEventTime(event)}</div>`;
        if (event.description) {
          html += `<div class="event-description">${this.app.escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? '...' : ''}</div>`;
        }
        html += '</div>';
      });
      
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    
    html += '</div>';
    container.innerHTML = html;
  }

  updateUpcomingEvents() {
    const container = document.getElementById('upcomingEvents');
    if (!container) return;
    
    const now = new Date();
    const upcoming = this.app.data.events
      .filter(event => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
    
    if (upcoming.length === 0) {
      container.innerHTML = '<div class="no-events">No upcoming events</div>';
      return;
    }
    
    container.innerHTML = upcoming.map(event => `
      <div class="upcoming-event" onclick="schedulerModule.editEvent('${event.id}')">
        <div class="event-color" style="background-color: ${event.color}"></div>
        <div class="event-info">
          <div class="event-title">${this.app.escapeHtml(event.title)}</div>
          <div class="event-datetime">${this.formatEventDateTime(event)}</div>
          ${event.description ? `<div class="event-description">${this.app.escapeHtml(event.description.substring(0, 50))}...</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  selectDate(dateString) {
    this.selectedDate = new Date(dateString);
    
    // Update visual selection
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-date="${dateString}"]`);
    if (selectedElement) {
      selectedElement.classList.add('selected');
    }
  }

  createEvent() {
    const startTime = this.selectedDate || new Date();
    this.showEventModal(null, startTime);
  }

  createEventAt(dateTimeString) {
    const startTime = new Date(dateTimeString);
    this.showEventModal(null, startTime);
  }

  editEvent(eventId) {
    const event = this.app.data.events.find(e => e.id === eventId);
    if (event) {
      this.showEventModal(event);
    }
  }

  showEventModal(event = null, defaultStartTime = null) {
    const isEdit = !!event;
    const startTime = event ? new Date(event.startTime) : (defaultStartTime || new Date());
    const endTime = event ? new Date(event.endTime) : new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content event-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-${isEdit ? 'edit' : 'plus'}"></i>
            ${isEdit ? 'Edit Event' : 'New Event'}
          </h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Event Title *</label>
            <input type="text" id="eventTitle" value="${event ? this.app.escapeHtml(event.title) : ''}" placeholder="Enter event title" required>
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea id="eventDescription" placeholder="Event description (optional)">${event ? this.app.escapeHtml(event.description || '') : ''}</textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Start Date</label>
              <input type="date" id="eventStartDate" value="${this.formatDateForInput(startTime)}" required>
            </div>
            <div class="form-group">
              <label>Start Time</label>
              <input type="time" id="eventStartTime" value="${this.formatTimeForInput(startTime)}" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>End Date</label>
              <input type="date" id="eventEndDate" value="${this.formatDateForInput(endTime)}" required>
            </div>
            <div class="form-group">
              <label>End Time</label>
              <input type="time" id="eventEndTime" value="${this.formatTimeForInput(endTime)}" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Color</label>
              <div class="color-picker">
                ${this.eventColors.map(color => `
                  <button type="button" class="color-option ${(event && event.color === color) || (!event && color === this.eventColors[0]) ? 'selected' : ''}" 
                          style="background-color: ${color}" 
                          onclick="schedulerModule.selectEventColor('${color}', this)"
                          data-color="${color}"></button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="eventCategory">
                <option value="general" ${event && event.category === 'general' ? 'selected' : ''}>General</option>
                <option value="work" ${event && event.category === 'work' ? 'selected' : ''}>Work</option>
                <option value="personal" ${event && event.category === 'personal' ? 'selected' : ''}>Personal</option>
                <option value="health" ${event && event.category === 'health' ? 'selected' : ''}>Health</option>
                <option value="education" ${event && event.category === 'education' ? 'selected' : ''}>Education</option>
                <option value="travel" ${event && event.category === 'travel' ? 'selected' : ''}>Travel</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Reminder</label>
            <select id="eventReminder">
              <option value="none" ${event && event.reminder === 'none' ? 'selected' : ''}>No reminder</option>
              <option value="5" ${event && event.reminder === '5' ? 'selected' : ''}>5 minutes before</option>
              <option value="15" ${event && event.reminder === '15' ? 'selected' : ''}>15 minutes before</option>
              <option value="30" ${event && event.reminder === '30' ? 'selected' : ''}>30 minutes before</option>
              <option value="60" ${event && event.reminder === '60' ? 'selected' : ''}>1 hour before</option>
              <option value="1440" ${event && event.reminder === '1440' ? 'selected' : ''}>1 day before</option>
            </select>
          </div>
          
          <div class="form-group">
            <div class="checkbox-options">
              <label class="checkbox-label">
                <input type="checkbox" id="eventAllDay" ${event && event.allDay ? 'checked' : ''}>
                All Day Event
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="eventImportant" ${event && event.important ? 'checked' : ''}>
                Mark as Important
              </label>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          ${isEdit ? `<button class="btn btn--danger" onclick="schedulerModule.deleteEvent('${event.id}')">Delete</button>` : ''}
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn--primary" onclick="schedulerModule.saveEvent(${isEdit ? `'${event.id}'` : 'null'})">
            <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} Event
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    
    // Setup all-day event toggle
    document.getElementById('eventAllDay').addEventListener('change', (e) => {
      const timeInputs = document.querySelectorAll('#eventStartTime, #eventEndTime');
      timeInputs.forEach(input => {
        input.disabled = e.target.checked;
      });
    });
    
    // Focus on title
    setTimeout(() => document.getElementById('eventTitle').focus(), 100);
  }

  selectEventColor(color, element) {
    document.querySelectorAll('.color-option').forEach(option => {
      option.classList.remove('selected');
    });
    element.classList.add('selected');
  }

  saveEvent(eventId = null) {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const startDate = document.getElementById('eventStartDate').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endDate = document.getElementById('eventEndDate').value;
    const endTime = document.getElementById('eventEndTime').value;
    const color = document.querySelector('.color-option.selected').getAttribute('data-color');
    const category = document.getElementById('eventCategory').value;
    const reminder = document.getElementById('eventReminder').value;
    const allDay = document.getElementById('eventAllDay').checked;
    const important = document.getElementById('eventImportant').checked;
    
    if (!title || !startDate || !endDate) {
      this.app.showToast('Please fill in required fields', 'warning');
      return;
    }
    
    // Create start and end datetime
    const startDateTime = allDay ? 
      new Date(`${startDate}T00:00:00`) : 
      new Date(`${startDate}T${startTime}:00`);
    
    const endDateTime = allDay ? 
      new Date(`${endDate}T23:59:59`) : 
      new Date(`${endDate}T${endTime}:00`);
    
    if (endDateTime <= startDateTime) {
      this.app.showToast('End time must be after start time', 'warning');
      return;
    }
    
    const eventData = {
      id: eventId || this.app.generateId(),
      title,
      description,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      color,
      category,
      reminder,
      allDay,
      important,
      created: eventId ? undefined : new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    if (eventId) {
      // Update existing event
      const index = this.app.data.events.findIndex(e => e.id === eventId);
      if (index !== -1) {
        this.app.data.events[index] = { ...this.app.data.events[index], ...eventData };
      }
    } else {
      // Create new event
      this.app.data.events.push(eventData);
    }
    
    // Save and update
    this.app.saveData();
    this.app.updateUI();
    this.renderCalendar();
    
    // Close modal
    document.querySelector('.modal-overlay').remove();
    
    this.app.showToast(`Event ${eventId ? 'updated' : 'created'} successfully`, 'success');
  }

  deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    this.app.data.events = this.app.data.events.filter(e => e.id !== eventId);
    this.app.saveData();
    this.app.updateUI();
    this.renderCalendar();
    
    document.querySelector('.modal-overlay').remove();
    this.app.showToast('Event deleted successfully', 'success');
  }

  // Utility methods
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isSelected(date) {
    return this.selectedDate && date.toDateString() === this.selectedDate.toDateString();
  }

  getEventsForDate(date) {
    const dateStr = date.toDateString();
    return this.app.data.events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      // Check if event spans this date
      return eventStart.toDateString() === dateStr || 
             eventEnd.toDateString() === dateStr ||
             (eventStart <= date && eventEnd >= date);
    });
  }

  getEventsForHour(date, hour = null) {
    const targetHour = hour !== null ? hour : date.getHours();
    const dateStr = date.toDateString();
    
    return this.app.data.events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      // Skip all-day events for hour view
      if (event.allDay) return false;
      
      // Check if event is active during this hour
      return eventStart.toDateString() === dateStr &&
             eventStart.getHours() <= targetHour &&
             eventEnd.getHours() > targetHour;
    });
  }

  formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  formatEventTime(event) {
    if (event.allDay) return 'All Day';
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  }

  formatEventDateTime(event) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    if (event.allDay) {
      return start.toLocaleDateString();
    }
    
    if (start.toDateString() === end.toDateString()) {
      return `${start.toLocaleDateString()} ${this.formatTime(start)} - ${this.formatTime(end)}`;
    }
    
    return `${start.toLocaleDateString()} ${this.formatTime(start)} - ${end.toLocaleDateString()} ${this.formatTime(end)}`;
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }

  formatTimeForInput(date) {
    return date.toTimeString().slice(0, 5);
  }

  getEventDuration(event) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return Math.ceil((end - start) / (1000 * 60 * 60)); // hours
  }

  // Initialize default events if none exist
  initializeDefaultEvents() {
    if (this.app.data.events.length === 0) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const defaultEvents = [
        {
          id: this.app.generateId(),
          title: 'Welcome to Shiro Notes Calendar',
          description: 'Start organizing your schedule with the built-in calendar feature.',
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0).toISOString(),
          color: this.eventColors[0],
          category: 'general',
          reminder: 'none',
          allDay: false,
          important: true,
          created: now.toISOString(),
          lastModified: now.toISOString()
        }
      ];
      
      this.app.data.events = defaultEvents;
      this.app.saveData();
    }
  }
}

// Initialize scheduler module
const schedulerModule = new SchedulerModule(app);
window.schedulerModule = schedulerModule;

// Initialize default events
schedulerModule.initializeDefaultEvents();

// Override app's loadSchedulerPage method
app.loadSchedulerPage = (page) => {
  schedulerModule.loadSchedulerPage();
  schedulerModule.renderCalendar();
};

// Add scheduler-specific styles
const schedulerStyles = `
.scheduler-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--space-4);
}

.scheduler-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-surface);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  flex-wrap: wrap;
  gap: var(--space-4);
}

.scheduler-nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  background-color: var(--color-secondary);
  color: var(--color-text);
  border-radius: var(--radius-base);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.nav-btn:hover {
  background-color: var(--color-secondary-hover);
}

.current-period {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
  min-width: 250px;
  text-align: center;
}

.view-controls {
  display: flex;
  gap: var(--space-1);
  background-color: var(--color-background);
  padding: var(--space-1);
  border-radius: var(--radius-base);
}

.view-btn {
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.view-btn:hover {
  background-color: var(--color-secondary);
  color: var(--color-text);
}

.view-btn.active {
  background-color: var(--color-primary);
  color: white;
}

.scheduler-actions {
  display: flex;
  gap: var(--space-2);
}

.calendar-container {
  display: flex;
  gap: var(--space-4);
  flex: 1;
  overflow: hidden;
}

.calendar-view {
  flex: 1;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  overflow: hidden;
}

.events-sidebar {
  width: 300px;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  padding: var(--space-4);
  overflow-y: auto;
}

.events-sidebar h3 {
  margin-bottom: var(--space-4);
  font-size: var(--font-size-lg);
  color: var(--color-text);
}

/* Month View */
.month-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.day-header {
  padding: var(--space-3);
  text-align: center;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  flex: 1;
  gap: 1px;
  background-color: var(--color-border);
}

.calendar-day {
  background-color: var(--color-surface);
  padding: var(--space-2);
  cursor: pointer;
  position: relative;
  min-height: 80px;
  transition: background-color var(--transition-fast);
  display: flex;
  flex-direction: column;
}

.calendar-day:hover {
  background-color: var(--color-secondary);
}

.calendar-day.today {
  background-color: var(--color-bg-1);
}

.calendar-day.selected {
  background-color: rgba(var(--color-teal-500-rgb), 0.2);
  border: 2px solid var(--color-primary);
}

.calendar-day.empty {
  background-color: var(--color-background);
  cursor: default;
}

.day-number {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.calendar-day.today .day-number {
  color: var(--color-primary);
  background-color: var(--color-primary);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
}

.day-events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.day-event {
  background-color: var(--color-primary);
  color: white;
  padding: 1px var(--space-1);
  border-radius: 2px;
  font-size: var(--font-size-xs);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-events {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 1px;
}

/* Week View */
.week-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.week-header {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.time-column-header {
  padding: var(--space-3);
  text-align: center;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.day-column-header {
  padding: var(--space-3);
  text-align: center;
  border-left: 1px solid var(--color-border);
}

.day-column-header.today {
  background-color: var(--color-bg-1);
}

.day-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.day-date {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-top: var(--space-1);
}

.day-column-header.today .day-date {
  color: var(--color-primary);
}

.week-body {
  flex: 1;
  overflow-y: auto;
}

.time-row {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  min-height: 60px;
  border-bottom: 1px solid var(--color-border);
}

.time-slot {
  padding: var(--space-2);
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.day-slot {
  border-left: 1px solid var(--color-border);
  cursor: pointer;
  position: relative;
  padding: var(--space-1);
  transition: background-color var(--transition-fast);
}

.day-slot:hover {
  background-color: var(--color-secondary);
}

.week-event {
  background-color: var(--color-primary);
  color: white;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  margin-bottom: var(--space-1);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.week-event:hover {
  opacity: 0.8;
}

.event-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: 1px;
}

.event-time {
  opacity: 0.8;
}

/* Day View */
.day-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
}

.day-header {
  margin-bottom: var(--space-6);
  text-align: center;
}

.day-schedule {
  flex: 1;
  overflow-y: auto;
}

.hour-slot {
  display: flex;
  min-height: 80px;
  border-bottom: 1px solid var(--color-border);
}

.hour-time {
  width: 80px;
  padding: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: right;
  border-right: 1px solid var(--color-border);
}

.hour-content {
  flex: 1;
  padding: var(--space-2);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.hour-content:hover {
  background-color: var(--color-secondary);
}

.day-event {
  background-color: var(--color-primary);
  color: white;
  padding: var(--space-3);
  border-radius: var(--radius-base);
  margin-bottom: var(--space-2);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.day-event:hover {
  opacity: 0.9;
}

.event-description {
  font-size: var(--font-size-xs);
  opacity: 0.9;
  margin-top: var(--space-1);
}

/* Upcoming Events */
.upcoming-events {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.upcoming-event {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  background-color: var(--color-background);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upcoming-event:hover {
  background-color: var(--color-secondary);
  transform: translateX(2px);
}

.event-color {
  width: 4px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.event-info {
  flex: 1;
  min-width: 0;
}

.upcoming-event .event-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.event-datetime {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.upcoming-event .event-description {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.no-events {
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
  padding: var(--space-6);
}

/* Event Modal */
.event-modal {
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--font-size-base);
  transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.color-picker {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--color-text);
  transform: scale(1.15);
}

.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--font-size-base);
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .calendar-container {
    flex-direction: column;
  }
  
  .events-sidebar {
    width: 100%;
    max-height: 200px;
  }
}

@media (max-width: 768px) {
  .scheduler-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .scheduler-nav {
    justify-content: center;
  }
  
  .current-period {
    min-width: unset;
  }
  
  .view-controls {
    align-self: center;
  }
  
  .scheduler-actions {
    justify-content: center;
  }
  
  .calendar-day {
    min-height: 60px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .week-header {
    grid-template-columns: 60px repeat(7, 1fr);
  }
  
  .time-row {
    grid-template-columns: 60px repeat(7, 1fr);
  }
  
  .time-slot {
    font-size: var(--font-size-xs);
    padding: var(--space-1);
  }
}

@media (max-width: 480px) {
  .day-events {
    display: none;
  }
  
  .calendar-day {
    min-height: 40px;
  }
  
  .color-picker {
    justify-content: center;
  }
}
`;

// Inject scheduler styles
const schedulerStyleSheet = document.createElement('style');
schedulerStyleSheet.textContent = schedulerStyles;
document.head.appendChild(schedulerStyleSheet);