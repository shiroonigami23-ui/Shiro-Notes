// Templates Module for Shiro Notes
class TemplatesModule {
  constructor(app) {
    this.app = app;
  }

  // Create a new template
  createTemplate() {
    this.showTemplateModal(null);
  }

  // Edit an existing template
  editTemplate(templateId) {
    const template = this.app.data.templates.find(t => t.id === templateId);
    if (template) {
      this.showTemplateModal(template);
    }
  }

  // Use a template to create a new note
  useTemplate(templateId) {
    const template = this.app.data.templates.find(t => t.id === templateId);
    if (!template) {
      this.app.showToast('Template not found', 'error');
      return;
    }

    // Replace placeholders like {{date}}
    let content = template.content.replace(/{{date}}/gi, new Date().toLocaleDateString());

    const note = {
      id: this.app.generateId(),
      title: `Note from ${template.name}`,
      content: content,
      type: template.type,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: [],
      bookmarked: false,
      encrypted: false,
    };

    this.app.data.notes.push(note);
    this.app.saveData();
    this.app.showToast(`Note created from '${template.name}' template!`, 'success');

    // Open the new note in the editor
    this.app.showPage('notes');
    setTimeout(() => editorModule.editNote(note.id), 100);
  }

  // Show the modal for creating/editing a template
  showTemplateModal(template) {
    const isEdit = !!template;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Template' : 'Create New Template'}</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Template Name</label>
            <input type="text" id="templateName" placeholder="e.g., Weekly Meeting" value="${template ? this.app.escapeHtml(template.name) : ''}">
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" id="templateDescription" placeholder="A brief description of the template" value="${template ? this.app.escapeHtml(template.description) : ''}">
          </div>
          <div class="form-group">
            <label>Template Content</label>
            <textarea id="templateContent" rows="10" placeholder="Enter your template content. Use {{date}} for the current date.">${template ? this.app.escapeHtml(template.content) : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn--primary" onclick="templatesModule.saveTemplate(${isEdit ? `'${template.id}'` : 'null'})">Save Template</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    setTimeout(() => document.getElementById('templateName').focus(), 100);
  }

  // Save or update a template
  saveTemplate(templateId) {
    const name = document.getElementById('templateName').value;
    const description = document.getElementById('templateDescription').value;
    const content = document.getElementById('templateContent').value;

    if (!name.trim() || !content.trim()) {
      this.app.showToast('Template name and content cannot be empty', 'warning');
      return;
    }

    if (templateId) {
      // Update existing template
      const template = this.app.data.templates.find(t => t.id === templateId);
      if (template) {
        template.name = name;
        template.description = description;
        template.content = content;
      }
    } else {
      // Create new template
      const newTemplate = {
        id: this.app.generateId(),
        name,
        description,
        content,
        type: 'text',
      };
      this.app.data.templates.push(newTemplate);
    }

    this.app.saveData();
    this.app.loadPageContent('templates');
    document.querySelector('.modal-overlay').remove();
    this.app.showToast(`Template ${templateId ? 'updated' : 'created'} successfully!`, 'success');
  }
}

// Initialize the module
const templatesModule = new TemplatesModule(app);
window.templatesModule = templatesModule;

// Override app's template methods
app.createTemplate = () => templatesModule.createTemplate();
app.useTemplate = (id) => templatesModule.useTemplate(id);
app.editTemplate = (id) => templatesModule.editTemplate(id);

// Note: `deleteTemplate` is already implemented in app.js and works correctly.


