# Shiro Notes - Advanced Note-Taking Web Application

![Shiro Notes](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow)

**Shiro Notes** is a comprehensive, feature-rich note-taking web application designed for students and professionals. With advanced features including encryption, canvas drawing, rich text editing, and audio recording, Shiro Notes provides everything you need to organize your knowledge effectively.

## ✨ Features

### 📚 **Organizational Structure**
- **Books** - Organize notes into books with custom covers and icons
- **Chapters** - Structure your books with chapters
- **Notes** - Rich text notes with advanced formatting
- **Folders** - Create folders to organize content
- **Tags** - Tag and categorize your notes

### ✍️ **Rich Text Editor**
- Microsoft Word-level formatting capabilities
- **Text Formatting**: Bold, Italic, Underline, Strikethrough
- **Fonts & Sizes**: Multiple font families and customizable sizes
- **Colors**: Text color and highlight options
- **Alignment**: Left, Center, Right, Justify
- **Lists**: Bullet lists, numbered lists
- **Insertions**: Images, Tables, Links, Code blocks
- **Keyboard Shortcuts**: Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline), Ctrl+S (Save)

### 🎨 **Canvas Drawing Tool**
- **Drawing Tools**: Brush, Pen, Eraser
- **Shapes**: Line, Rectangle, Circle, Arrow
- **Text Tool**: Add text to drawings
- **Color Palette**: Choose from preset colors or custom colors
- **Brush Sizes**: Adjustable from 1-50px
- **Undo/Redo**: Full history support
- **Export**: Save as PNG

### 🔒 **Security & Encryption**
- **AES Encryption**: Encrypt notes and chapters with password protection
- **Password Strength Meter**: Visual feedback on password security
- **App Lock**: 6-digit passcode to protect the entire app
- **Auto-Lock**: Automatic locking after inactivity
- **Encrypted Sharing**: Share encrypted messages securely

### 📤 **Export & Sharing**
- **PDF Export**: Export notes as PDF documents
- **Image Export**: Export as PNG or JPG
- **Text Export**: Plain text export
- **Encrypted Messages**: Share encrypted notes with password protection
- **Book Export**: Export entire books with all chapters

### 🎙️ **Audio Recording**
- **Voice Notes**: Record audio directly in the app
- **Playback**: Play recorded audio
- **Waveform Visualization**: See audio levels while recording
- **Audio Export**: Download recordings as WAV files
- **Attach to Notes**: Link audio recordings to specific notes

### 📅 **Event Scheduler**
- **Calendar View**: Monthly calendar with day/week/month views
- **Event Creation**: Add events with title, date, time
- **Color Coding**: Assign colors to different event types
- **Event List**: View upcoming events
- **Event Management**: Edit and delete events

### 🌓 **Themes & Appearance**
- **Light Mode**: Clean, bright interface
- **Dark Mode**: Eye-friendly dark theme
- **Auto Theme**: Match system preferences
- **Responsive Design**: Perfect for all screen sizes

### 👤 **Profile Management**
- **Avatar Upload**: Upload custom profile pictures
- **Default Avatars**: Choose from preset avatars
- **User Information**: Name, email, bio
- **Profile Export**: Export profile data

### 🔍 **Search & Filter**
- **Global Search**: Search across all notes, books, and chapters
- **Book Filtering**: Filter books by name
- **Sorting**: Sort by date, name, or recent activity
- **Tag Filtering**: Find notes by tags

### 💾 **Data Management**
- **Local Storage**: All data stored locally on your device
- **No Server Required**: Fully client-side application
- **Data Export**: Export all data as JSON
- **Data Import**: Import previously exported data
- **No Cloud Dependency**: Your data stays on your device

## 🚀 Getting Started

### Installation

1. **Download the ZIP file**
   ```bash
   # Extract shiro-notes.zip to your desired location
   ```

2. **Open in Browser**
   - Simply open `index.html` in any modern web browser
   - No server or installation required!

### Browser Compatibility

Shiro Notes works best on modern browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required Browser Features
- LocalStorage API
- Canvas API
- MediaRecorder API (for audio recording)
- File API (for image/file uploads)

## 📖 How to Use

### Creating Your First Book

1. Click the **"New Book"** button on the dashboard
2. Enter a book title
3. The book will appear with a random gradient cover

### Adding Chapters

1. Open a book
2. Click **"Add Chapter"**
3. Enter chapter title
4. Start adding notes to the chapter

### Writing Notes

1. Open a chapter (or click "Quick Note")
2. Use the rich text toolbar to format your content
3. Insert images, tables, links, or code blocks
4. Click **Save** (or Ctrl+S)

### Encrypting Notes

1. Open a note
2. Click the **lock icon** in the toolbar
3. Enter a strong password
4. The note will be encrypted and secured

### Drawing on Canvas

1. Navigate to the **Canvas** page
2. Select a tool (brush, pen, shapes)
3. Choose colors and brush size
4. Start drawing!
5. Click **Save** to store your drawing

### Recording Audio

1. Open the note editor
2. Click the **microphone icon**
3. Click **Record** to start
4. Click **Stop** when finished
5. Play back or download your recording

### Scheduling Events

1. Go to the **Scheduler** page
2. Click **"Add Event"**
3. Enter event details (title, date, time, color)
4. View events in the calendar or list

### Setting App Lock

1. Go to **Settings**
2. Click **"Set Passcode"**
3. Enter a 6-digit passcode
4. The app will require this passcode on launch

## 🔧 Configuration

### Customizing Themes

Edit `styles.css` to customize colors:

```css
:root {
    --primary: hsl(220, 70%, 50%);  /* Primary color */
    --secondary: hsl(270, 50%, 60%); /* Secondary color */
    /* ... more variables */
}
```

### Adding Custom Avatars

1. Place avatar images in the `assets/` folder
2. Name them: `avatar1.png`, `avatar2.png`, etc.
3. Update the avatar paths in `app.js` if needed

## 📁 Project Structure

```
shiro-notes/
├── index.html          # Main HTML file
├── styles.css          # All styles and themes
├── app.js             # Core application logic
├── editor.js          # Rich text editor
├── canvas.js          # Drawing canvas
├── crypto.js          # Encryption/decryption
├── export.js          # Export functionality
├── audio.js           # Audio recording
├── scheduler.js       # Event scheduler
├── security.js        # Security & lock features
├── profile.js         # Profile management
├── assets/            # Images and avatars
└── README.md          # This file
```

## 🔐 Security Notes

### Data Privacy
- **100% Local**: All data is stored locally in your browser's localStorage
- **No Server**: No data is sent to any server
- **No Tracking**: No analytics or tracking
- **Offline Ready**: Works completely offline

### Encryption
- **AES Encryption**: Industry-standard encryption for sensitive notes
- **Password Protected**: Only you have access with your password
- **Secure by Design**: Encrypted content cannot be decrypted without the password

### Important Security Tips
1. **Remember Your Passwords**: Lost passwords cannot be recovered
2. **Strong Passwords**: Use complex passwords for encryption
3. **Backup Regularly**: Export your data periodically
4. **Private Browsing**: Be cautious in shared/public computers

## 💡 Tips & Tricks

### Keyboard Shortcuts
- `Ctrl + B` - Bold text
- `Ctrl + I` - Italic text
- `Ctrl + U` - Underline text
- `Ctrl + S` - Save note
- `Ctrl + Z` - Undo (in canvas)

### Best Practices
1. **Regular Backups**: Export your data weekly
2. **Organize with Tags**: Use tags for easy filtering
3. **Use Bookmarks**: Mark important notes
4. **Color Code Events**: Use colors for different event types
5. **Encrypt Sensitive Data**: Protect confidential information

## 🛠️ Technical Stack

### Core Technologies
- **HTML5** - Structure
- **CSS3** - Styling with custom properties
- **JavaScript (ES6+)** - Application logic

### External Libraries
- **CryptoJS** - AES encryption/decryption
- **jsPDF** - PDF generation
- **html2canvas** - HTML to image conversion
- **Font Awesome** - Icons

### APIs Used
- **localStorage** - Data persistence
- **Canvas API** - Drawing functionality
- **MediaRecorder API** - Audio recording
- **File API** - File uploads

## 🐛 Troubleshooting

### Issue: Notes not saving
**Solution**: Check if localStorage is enabled in your browser

### Issue: Audio recording not working
**Solution**: Grant microphone permissions to your browser

### Issue: Export not working
**Solution**: Ensure jsPDF and html2canvas libraries are loaded

### Issue: Images not displaying
**Solution**: Check the file path and format (JPG/PNG supported)

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review the FAQ section

## 🎯 Roadmap

Future enhancements planned:
- [ ] Cloud sync option
- [ ] Collaborative editing
- [ ] OCR for images
- [ ] Voice-to-text
- [ ] Browser extension
- [ ] Mobile apps
- [ ] Multi-language support
- [ ] Advanced chart/graph tools

## 🙏 Acknowledgments

- Font Awesome for icons
- CryptoJS for encryption
- jsPDF and html2canvas for export features
- The open-source community

## 📊 Version History

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ All core features implemented
- ✅ Full offline functionality
- ✅ Complete security features

---

**Made with ❤️ for students and knowledge workers**

*Shiro Notes - Your secure, feature-rich note-taking companion*
