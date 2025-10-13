// Audio Recording Module for Shiro Notes
class AudioModule {
  constructor(app) {
    this.app = app;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.animationId = null;
    this.currentRecordingBlob = null;
    this.waveformCanvas = null;
    this.waveformCtx = null;
  }

  async init() {
    try {
      await this.setupAudioContext();
      this.setupWaveform();
      this.updateAudioList();
    } catch (error) {
      console.error('Error initializing audio module:', error);
      this.app.showToast('Microphone access denied or not available', 'error');
    }
  }

  async setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      return true;
    } catch (error) {
      console.error('Error setting up audio context:', error);
      return false;
    }
  }

  setupWaveform() {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) return;
    
    // Create canvas for waveform visualization
    this.waveformCanvas = document.createElement('canvas');
    this.waveformCanvas.width = 400;
    this.waveformCanvas.height = 100;
    this.waveformCanvas.style.width = '100%';
    this.waveformCanvas.style.height = '100px';
    this.waveformCanvas.style.backgroundColor = 'var(--color-background)';
    this.waveformCanvas.style.borderRadius = 'var(--radius-base)';
    
    this.waveformCtx = this.waveformCanvas.getContext('2d');
    waveformContainer.appendChild(this.waveformCanvas);
    
    // Draw initial flat line
    this.drawWaveform([]);
  }

  drawWaveform(dataArray = null) {
    if (!this.waveformCtx) return;
    
    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    
    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-background');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const centerY = canvas.height / 2;
    
    if (!dataArray || dataArray.length === 0) {
      // Draw flat line when not recording
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
    } else {
      // Draw actual waveform
      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0; // normalize to 0-2 range
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
    }
    
    ctx.stroke();
    
    // Draw recording indicator
    if (this.isRecording) {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(20, 20, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text');
      ctx.font = '12px Arial';
      ctx.fillText('REC', 35, 25);
    }
  }

  animateWaveform() {
    if (!this.isRecording || !this.analyser) {
      this.drawWaveform([]);
      return;
    }
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    this.drawWaveform(this.dataArray);
    
    this.animationId = requestAnimationFrame(() => this.animateWaveform());
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100
        } 
      });
      
      // Setup media recorder
      const options = {
        audioBitsPerSecond: 128000,
        mimeType: this.getSupportedMimeType()
      };
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.processRecording();
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Setup audio visualization
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      // Start recording
      this.mediaRecorder.start(100); // Record in 100ms chunks
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      // Update UI
      this.updateRecordingUI(true);
      this.startTimer();
      this.animateWaveform();
      
      this.app.showToast('Recording started', 'success');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      this.app.showToast('Failed to start recording. Please check microphone permissions.', 'error');
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;
    
    this.isRecording = false;
    this.mediaRecorder.stop();
    
    // Clean up visualization
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    // Update UI
    this.updateRecordingUI(false);
    this.stopTimer();
    this.drawWaveform([]);
    
    this.app.showToast('Recording stopped', 'info');
  }

  processRecording() {
    if (this.audioChunks.length === 0) return;
    
    const mimeType = this.getSupportedMimeType();
    this.currentRecordingBlob = new Blob(this.audioChunks, { type: mimeType });
    
    // Enable play button
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.disabled = false;
    }
    
    // Show save dialog
    this.showSaveDialog();
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // fallback
  }

  playRecording() {
    if (!this.currentRecordingBlob) return;
    
    const audio = new Audio();
    audio.src = URL.createObjectURL(this.currentRecordingBlob);
    
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
    };
    
    audio.play().catch(error => {
      console.error('Error playing recording:', error);
      this.app.showToast('Error playing recording', 'error');
    });
  }

  showSaveDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Save Audio Recording</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Recording Title</label>
            <input type="text" id="audioTitle" placeholder="Enter title for your recording" value="Voice Recording ${new Date().toLocaleString()}">
          </div>
          <div class="form-group">
            <label>Tags (comma separated)</label>
            <input type="text" id="audioTags" placeholder="audio, voice, recording">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="audioDescription" placeholder="Optional description..."></textarea>
          </div>
          <div class="audio-preview">
            <h4>Preview</h4>
            <div class="audio-controls">
              <button class="btn btn--secondary" onclick="audioModule.playRecording()">
                <i class="fas fa-play"></i> Play
              </button>
              <span class="duration">${this.getRecordingDuration()}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="audioModule.discardRecording(); this.closest('.modal-overlay').remove();">Discard</button>
          <button class="btn btn--primary" onclick="audioModule.saveRecording();">Save Recording</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    
    // Focus on title input
    setTimeout(() => {
      document.getElementById('audioTitle').focus();
      document.getElementById('audioTitle').select();
    }, 100);
  }

  getRecordingDuration() {
    if (!this.recordingStartTime) return '00:00';
    
    const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
    const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
    const seconds = (duration % 60).toString().padStart(2, '0');
    
    return `${minutes}:${seconds}`;
  }

  async saveRecording() {
    const title = document.getElementById('audioTitle').value || 'Voice Recording';
    const tags = document.getElementById('audioTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const description = document.getElementById('audioDescription').value;
    
    if (!this.currentRecordingBlob) {
      this.app.showToast('No recording to save', 'error');
      return;
    }
    
    try {
      // Convert blob to data URL for storage
      const dataURL = await this.blobToDataURL(this.currentRecordingBlob);
      
      const audioNote = {
        id: this.app.generateId(),
        title,
        content: description || '',
        type: 'audio',
        audioData: dataURL,
        duration: this.getRecordingDuration(),
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: [...tags, 'audio'],
        bookmarked: false,
        encrypted: false
      };
      
      this.app.data.notes.push(audioNote);
      this.app.saveData();
      this.app.updateUI();
      
      // Close modal
      document.querySelector('.modal-overlay').remove();
      
      // Update audio list
      this.updateAudioList();
      
      // Clean up
      this.currentRecordingBlob = null;
      this.recordingStartTime = null;
      
      // Reset buttons
      const playBtn = document.getElementById('playBtn');
      if (playBtn) playBtn.disabled = true;
      
      this.app.showToast('Audio recording saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving recording:', error);
      this.app.showToast('Error saving recording', 'error');
    }
  }

  blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  discardRecording() {
    this.currentRecordingBlob = null;
    this.recordingStartTime = null;
    
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.disabled = true;
    
    this.app.showToast('Recording discarded', 'info');
  }

  updateRecordingUI(isRecording) {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (recordBtn) {
      recordBtn.classList.toggle('recording', isRecording);
      recordBtn.innerHTML = isRecording ? 
        '<i class="fas fa-stop"></i>' : 
        '<i class="fas fa-microphone"></i>';
    }
    
    if (stopBtn) {
      stopBtn.disabled = !isRecording;
    }
  }

  startTimer() {
    const timerEl = document.getElementById('recordingTimer');
    if (!timerEl) return;
    
    this.recordingTimer = setInterval(() => {
      if (this.recordingStartTime) {
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        timerEl.textContent = `${minutes}:${seconds}`;
      }
    }, 1000);
  }

  stopTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    const timerEl = document.getElementById('recordingTimer');
    if (timerEl) {
      timerEl.textContent = '00:00';
    }
  }

  updateAudioList() {
    const audioList = document.getElementById('audioList');
    if (!audioList) return;
    
    const audioNotes = this.app.data.notes.filter(note => note.type === 'audio');
    
    if (audioNotes.length === 0) {
      audioList.innerHTML = '<div class="empty-state"><i class="fas fa-microphone"></i><h3>No audio recordings yet</h3><p>Start recording to create your first audio note</p></div>';
      return;
    }
    
    audioList.innerHTML = audioNotes
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .map(audio => this.createAudioCard(audio))
      .join('');
  }

  createAudioCard(audio) {
    return `
      <div class="audio-card" data-id="${audio.id}">
        <div class="audio-header">
          <div class="audio-icon">
            <i class="fas fa-music"></i>
          </div>
          <div class="audio-info">
            <h4>${this.app.escapeHtml(audio.title)}</h4>
            <div class="audio-meta">
              <span class="duration"><i class="fas fa-clock"></i> ${audio.duration}</span>
              <span class="date"><i class="fas fa-calendar"></i> ${this.app.formatDate(audio.created)}</span>
            </div>
            ${audio.content ? `<p class="description">${this.app.escapeHtml(audio.content)}</p>` : ''}
          </div>
        </div>
        
        <div class="audio-controls">
          <button class="control-btn play-btn" onclick="audioModule.playAudio('${audio.id}')" title="Play">
            <i class="fas fa-play"></i>
          </button>
          <button class="control-btn" onclick="audioModule.downloadAudio('${audio.id}')" title="Download">
            <i class="fas fa-download"></i>
          </button>
          <button class="control-btn" onclick="audioModule.editAudio('${audio.id}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="control-btn danger" onclick="audioModule.deleteAudio('${audio.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        
        <div class="audio-waveform">
          <canvas class="mini-waveform" data-audio-id="${audio.id}"></canvas>
        </div>
        
        ${audio.tags && audio.tags.length > 0 ? `
          <div class="audio-tags">
            ${audio.tags.filter(tag => tag !== 'audio').map(tag => `<span class="tag">${this.app.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  playAudio(audioId) {
    const audio = this.app.data.notes.find(note => note.id === audioId);
    if (!audio || !audio.audioData) return;
    
    // Stop any currently playing audio
    this.stopAllAudio();
    
    const audioElement = new Audio(audio.audioData);
    const playBtn = document.querySelector(`[onclick="audioModule.playAudio('${audioId}')"]`);
    
    audioElement.onloadstart = () => {
      if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        playBtn.disabled = true;
      }
    };
    
    audioElement.oncanplay = () => {
      if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playBtn.disabled = false;
      }
    };
    
    audioElement.onended = () => {
      if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
      this.currentlyPlaying = null;
    };
    
    audioElement.onerror = () => {
      if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.disabled = false;
      }
      this.app.showToast('Error playing audio', 'error');
    };
    
    // Handle play/pause toggle
    if (this.currentlyPlaying === audioId) {
      audioElement.pause();
      this.currentlyPlaying = null;
      if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      audioElement.play();
      this.currentlyPlaying = audioId;
    }
    
    // Store reference for cleanup
    this.currentAudioElement = audioElement;
  }

  stopAllAudio() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    
    // Reset all play buttons
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    this.currentlyPlaying = null;
  }

  downloadAudio(audioId) {
    const audio = this.app.data.notes.find(note => note.id === audioId);
    if (!audio || !audio.audioData) return;
    
    try {
      const link = document.createElement('a');
      link.href = audio.audioData;
      link.download = `${audio.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.webm`;
      link.click();
      
      this.app.showToast('Audio download started', 'success');
    } catch (error) {
      console.error('Error downloading audio:', error);
      this.app.showToast('Error downloading audio', 'error');
    }
  }

  editAudio(audioId) {
    const audio = this.app.data.notes.find(note => note.id === audioId);
    if (!audio) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Audio Recording</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="editAudioTitle" value="${this.app.escapeHtml(audio.title)}">
          </div>
          <div class="form-group">
            <label>Tags (comma separated)</label>
            <input type="text" id="editAudioTags" value="${audio.tags ? audio.tags.filter(tag => tag !== 'audio').join(', ') : ''}">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="editAudioDescription">${this.app.escapeHtml(audio.content || '')}</textarea>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="editAudioBookmarked" ${audio.bookmarked ? 'checked' : ''}>
              Bookmark this recording
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn--primary" onclick="audioModule.saveAudioEdit('${audioId}')">Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  saveAudioEdit(audioId) {
    const audio = this.app.data.notes.find(note => note.id === audioId);
    if (!audio) return;
    
    const title = document.getElementById('editAudioTitle').value;
    const tags = document.getElementById('editAudioTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const description = document.getElementById('editAudioDescription').value;
    const bookmarked = document.getElementById('editAudioBookmarked').checked;
    
    audio.title = title;
    audio.content = description;
    audio.tags = [...tags, 'audio'];
    audio.bookmarked = bookmarked;
    audio.lastModified = new Date().toISOString();
    
    this.app.saveData();
    this.app.updateUI();
    this.updateAudioList();
    
    document.querySelector('.modal-overlay').remove();
    this.app.showToast('Audio recording updated', 'success');
  }

  deleteAudio(audioId) {
    if (!confirm('Are you sure you want to delete this audio recording?')) return;
    
    this.app.data.notes = this.app.data.notes.filter(note => note.id !== audioId);
    this.app.saveData();
    this.app.updateUI();
    this.updateAudioList();
    
    this.app.showToast('Audio recording deleted', 'success');
  }

  // Audio effects (placeholder for future implementation)
  applyEffect(audioId, effect) {
    this.app.showToast(`${effect} effect will be implemented in a future version`, 'info');
  }

  // Export audio list
  exportAudioList() {
    const audioNotes = this.app.data.notes.filter(note => note.type === 'audio');
    const exportData = {
      exported: new Date().toISOString(),
      count: audioNotes.length,
      recordings: audioNotes.map(audio => ({
        title: audio.title,
        description: audio.content,
        duration: audio.duration,
        created: audio.created,
        tags: audio.tags
      }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `audio_recordings_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
    this.app.showToast('Audio list exported successfully', 'success');
  }

  // Cleanup
  cleanup() {
    this.stopAllAudio();
    
    if (this.isRecording) {
      this.stopRecording();
    }
    
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Initialize audio module
const audioModule = new AudioModule(app);
window.audioModule = audioModule;

// Add audio-specific styles
const audioStyles = `
.audio-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--space-6);
}

.audio-recorder {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  border: 1px solid var(--color-card-border);
  text-align: center;
}

.recorder-display {
  margin: var(--space-6) 0;
}

#waveform {
  height: 100px;
  border-radius: var(--radius-base);
  margin-bottom: var(--space-4);
  position: relative;
  overflow: hidden;
}

.timer {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  font-family: monospace;
}

.recorder-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
}

.record-btn {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  border: none;
  background-color: var(--color-error);
  color: white;
  font-size: var(--font-size-2xl);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.record-btn:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.record-btn.recording {
  background-color: var(--color-error);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--color-red-400-rgb, 255, 84, 89), 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(var(--color-red-400-rgb, 255, 84, 89), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--color-red-400-rgb, 255, 84, 89), 0); }
}

.audio-library {
  flex: 1;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  border: 1px solid var(--color-card-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.audio-library h3 {
  margin-bottom: var(--space-4);
}

#audioList {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.audio-card {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition-normal);
}

.audio-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.audio-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.audio-icon {
  width: 40px;
  height: 40px;
  background-color: var(--color-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-info h4 {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.audio-meta {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.audio-meta span {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-2) 0 0 0;
  line-height: var(--line-height-normal);
}

.audio-controls {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: var(--color-secondary);
  color: var(--color-text);
  border-radius: var(--radius-base);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.control-btn:hover {
  background-color: var(--color-secondary-hover);
  transform: scale(1.05);
}

.control-btn.danger:hover {
  background-color: var(--color-error);
  color: white;
}

.play-btn {
  background-color: var(--color-primary);
  color: white;
}

.play-btn:hover {
  background-color: var(--color-primary-hover);
}

.audio-waveform {
  height: 40px;
  margin-bottom: var(--space-3);
}

.mini-waveform {
  width: 100%;
  height: 40px;
  background-color: var(--color-surface);
  border-radius: var(--radius-base);
}

.audio-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  background-color: var(--color-primary);
  color: white;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.empty-state {
  text-align: center;
  padding: var(--space-12);
  color: var(--color-text-secondary);
}

.empty-state i {
  font-size: var(--font-size-4xl);
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-state h3 {
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.audio-preview {
  background-color: var(--color-background);
  border-radius: var(--radius-base);
  padding: var(--space-4);
  margin: var(--space-4) 0;
}

.audio-preview h4 {
  margin-bottom: var(--space-3);
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.duration {
  font-family: monospace;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* Form styles for modals */
.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.form-group input,
.form-group textarea {
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
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

/* Responsive Design */
@media (max-width: 768px) {
  .audio-container {
    gap: var(--space-4);
  }
  
  .recorder-controls {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .record-btn {
    width: 60px;
    height: 60px;
    font-size: var(--font-size-xl);
  }
  
  .audio-card {
    padding: var(--space-3);
  }
  
  .audio-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .audio-controls {
    flex-wrap: wrap;
  }
  
  .control-btn {
    width: 28px;
    height: 28px;
    font-size: var(--font-size-xs);
  }
}
`;

// Inject audio styles
const audioStyleSheet = document.createElement('style');
audioStyleSheet.textContent = audioStyles;
document.head.appendChild(audioStyleSheet);