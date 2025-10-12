// ===== Audio Recording =====

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordings = [];
        this.isRecording = false;
        this.recordingTime = 0;
        this.timerInterval = null;
        
        this.setupAudioControls();
    }

    setupAudioControls() {
        const recordBtn = document.getElementById('recordAudioBtn');
        const startBtn = document.getElementById('startRecordBtn');
        const stopBtn = document.getElementById('stopRecordBtn');
        const playBtn = document.getElementById('playAudioBtn');

        recordBtn?.addEventListener('click', () => {
            this.toggleRecorder();
        });

        startBtn?.addEventListener('click', () => {
            this.startRecording();
        });

        stopBtn?.addEventListener('click', () => {
            this.stopRecording();
        });

        playBtn?.addEventListener('click', () => {
            this.playLastRecording();
        });
    }

    toggleRecorder() {
        const recorder = document.getElementById('audioRecorder');
        recorder?.classList.toggle('hidden');
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                const recording = {
                    id: Date.now().toString(),
                    url: audioUrl,
                    blob: audioBlob,
                    duration: this.recordingTime,
                    createdAt: new Date().toISOString()
                };

                this.recordings.push(recording);
                this.displayRecordings();
                this.stopTimer();
            });

            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTimer();

            document.getElementById('startRecordBtn').disabled = true;
            document.getElementById('stopRecordBtn').disabled = false;

            app.showToast('Recording started', 'success');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            app.showToast('Microphone access denied', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;

            document.getElementById('startRecordBtn').disabled = false;
            document.getElementById('stopRecordBtn').disabled = true;
            document.getElementById('playAudioBtn').disabled = false;

            app.showToast('Recording stopped', 'success');
        }
    }

    startTimer() {
        this.recordingTime = 0;
        const timerDisplay = document.getElementById('recordTimer');

        this.timerInterval = setInterval(() => {
            this.recordingTime++;
            const minutes = Math.floor(this.recordingTime / 60).toString().padStart(2, '0');
            const seconds = (this.recordingTime % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    playLastRecording() {
        if (this.recordings.length === 0) return;

        const lastRecording = this.recordings[this.recordings.length - 1];
        const audio = new Audio(lastRecording.url);
        audio.play();
    }

    displayRecordings() {
        const container = document.getElementById('audioList');
        if (!container) return;

        container.innerHTML = this.recordings.map((rec, index) => `
            <div class="audio-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: var(--surface); border-radius: var(--radius-md);">
                <button onclick="audioRecorder.playRecording(${index})" class="icon-btn">
                    <i class="fas fa-play"></i>
                </button>
                <span>Recording ${index + 1}</span>
                <span style="margin-left: auto; font-size: 0.875rem; color: var(--text-secondary);">
                    ${Math.floor(rec.duration / 60)}:${(rec.duration % 60).toString().padStart(2, '0')}
                </span>
                <button onclick="audioRecorder.downloadRecording(${index})" class="icon-btn">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="audioRecorder.deleteRecording(${index})" class="icon-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    playRecording(index) {
        const recording = this.recordings[index];
        if (!recording) return;

        const audio = new Audio(recording.url);
        audio.play();
    }

    downloadRecording(index) {
        const recording = this.recordings[index];
        if (!recording) return;

        const a = document.createElement('a');
        a.href = recording.url;
        a.download = `recording_${recording.id}.wav`;
        a.click();
        app.showToast('Recording downloaded', 'success');
    }

    deleteRecording(index) {
        if (confirm('Delete this recording?')) {
            URL.revokeObjectURL(this.recordings[index].url);
            this.recordings.splice(index, 1);
            this.displayRecordings();
            app.showToast('Recording deleted', 'success');
        }
    }

    visualizeAudio() {
        const canvas = document.getElementById('audioWaveform');
        if (!canvas) return;

        const canvasCtx = canvas.getContext('2d');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (this.mediaRecorder && this.mediaRecorder.stream) {
            const source = audioContext.createMediaStreamSource(this.mediaRecorder.stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                if (!this.isRecording) return;

                requestAnimationFrame(draw);
                analyser.getByteTimeDomainData(dataArray);

                canvasCtx.fillStyle = 'var(--surface)';
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = 'var(--primary)';
                canvasCtx.beginPath();

                const sliceWidth = canvas.width / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * canvas.height / 2;

                    if (i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                canvasCtx.lineTo(canvas.width, canvas.height / 2);
                canvasCtx.stroke();
            };

            draw();
        }
    }
}

// Initialize audio recorder
const audioRecorder = new AudioRecorder();
