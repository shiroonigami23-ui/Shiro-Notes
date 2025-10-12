// ===== Event Scheduler =====

class EventScheduler {
    constructor() {
        this.currentDate = new Date();
        this.events = [];
        this.init();
    }

    init() {
        this.loadEvents();
        this.renderCalendar();
        this.setupEventListeners();
    }

    loadEvents() {
        this.events = app.data.events || [];
    }

    setupEventListeners() {
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        document.getElementById('addEventBtn')?.addEventListener('click', () => {
            this.addEvent();
        });
    }

    renderCalendar() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        const currentMonth = document.getElementById('currentMonth');
        if (currentMonth) {
            currentMonth.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }

        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const prevLastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 0);

        let days = '';

        // Day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            days += `<div class="calendar-day" style="font-weight: 600; background: var(--surface); cursor: default;">${day}</div>`;
        });

        // Previous month days
        for (let i = firstDay.getDay(); i > 0; i--) {
            const day = prevLastDay.getDate() - i + 1;
            days += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const isToday = date.toDateString() === today.toDateString();
            const dayEvents = this.getEventsForDate(date);

            days += `
                <div class="calendar-day ${isToday ? 'today' : ''}" onclick="scheduler.selectDate('${date.toISOString()}')">
                    <span class="day-number">${day}</span>
                    ${dayEvents.length > 0 ? `
                        <div class="day-events">
                            ${dayEvents.slice(0, 3).map(e => `<div class="event-dot" style="background: ${e.color || 'var(--primary)'}"></div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Next month days
        const remainingDays = 42 - (firstDay.getDay() + lastDay.getDate());
        for (let day = 1; day <= remainingDays; day++) {
            days += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
        }

        grid.innerHTML = days;
        this.renderEventsList();
    }

    getEventsForDate(date) {
        return this.events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.toDateString() === date.toDateString();
        });
    }

    renderEventsList() {
        const container = document.getElementById('eventsList');
        if (!container) return;

        const upcomingEvents = this.events
            .filter(e => new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 10);

        if (upcomingEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar"></i>
                    <p>No upcoming events</p>
                </div>
            `;
            return;
        }

        container.innerHTML = upcomingEvents.map(event => `
            <div class="event-item" onclick="scheduler.editEvent('${event.id}')">
                <div class="event-color" style="background: ${event.color || 'var(--primary)'}"></div>
                <div style="flex: 1;">
                    <h4>${event.title}</h4>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${new Date(event.date).toLocaleDateString()} at ${event.time || '00:00'}
                    </p>
                </div>
                <button class="icon-btn" onclick="event.stopPropagation(); scheduler.deleteEvent('${event.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    selectDate(dateString) {
        const date = new Date(dateString);
        this.addEvent(date);
    }

    addEvent(date = new Date()) {
        const title = prompt('Event title:');
        if (!title) return;

        const time = prompt('Time (HH:MM):', '09:00');
        const color = prompt('Color (hex):', '#667eea') || '#667eea';

        const event = {
            id: Date.now().toString(),
            title: title,
            date: date.toISOString(),
            time: time,
            color: color,
            notes: '',
            createdAt: new Date().toISOString()
        };

        this.events.push(event);
        app.data.events = this.events;
        app.saveData('events');
        this.renderCalendar();
        app.showToast('Event added', 'success');
    }

    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const newTitle = prompt('Event title:', event.title);
        if (newTitle === null) return;

        const newTime = prompt('Time (HH:MM):', event.time);
        if (newTime === null) return;

        event.title = newTitle;
        event.time = newTime;

        app.data.events = this.events;
        app.saveData('events');
        this.renderCalendar();
        app.showToast('Event updated', 'success');
    }

    deleteEvent(eventId) {
        if (!confirm('Delete this event?')) return;

        const index = this.events.findIndex(e => e.id === eventId);
        if (index > -1) {
            this.events.splice(index, 1);
            app.data.events = this.events;
            app.saveData('events');
            this.renderCalendar();
            app.showToast('Event deleted', 'success');
        }
    }
}

// Initialize scheduler
const scheduler = new EventScheduler();
