# FoodTruck Feedback Experience

A comprehensive React single-page application for collecting customer feedback from food truck visitors. This app provides an interactive, accessible, and production-ready solution for gathering video, audio, and text responses.

## ✨ Features

### 🎥 Interactive Feedback Flow
- AI-guided conversation with sequential video prompts
- Multiple response modes: Video recording, audio upload, text with star ratings
- Client-side video stitching using FFmpeg.wasm
- Automatic upload to Google Drive based on user consent

### 📱 Mobile-First Design
- Responsive design optimized for all device sizes
- Touch-friendly interface with large tap targets
- Progressive Web App (PWA) capabilities
- Offline-ready with service worker support

### ♿ Accessibility Excellence
- WCAG 2.1 AA compliant
- High contrast mode toggle
- Keyboard navigation support
- Screen reader optimized
- Skip links and ARIA labels
- Subtitle support for all videos

### 🔒 Privacy & Security
- GDPR/CCPA compliant with explicit consent management
- Client-side processing (no backend required)
- Content moderation for inappropriate responses
- Secure file handling and validation
- Comprehensive audit logging

### 🎨 Premium Design
- Clean, modern interface with smooth animations
- Poppins typography with proper hierarchy
- Teal-mint color scheme with high contrast ratios
- Framer Motion animations and micro-interactions
- Card-based layout with soft shadows

### 🚀 Performance Optimized
- Handles 500+ submissions/day
- 200+ concurrent users supported
- Browser-based queuing and retry logic
- Efficient video caching and compression
- Bundle size optimization

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript, Vite
- **Styling**: Tailwind CSS with custom theme
- **Animations**: Framer Motion
- **Video Processing**: FFmpeg.wasm (client-side)
- **Recording**: react-webcam, react-dropzone
- **Storage**: Supabase, Google Drive API
- **Deployment**: Netlify

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account for video storage
- Google Drive API credentials
- (Optional) Telegram bot for alerts

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd foodtruck-feedback-spa
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Fill in your API keys and configuration
   ```

3. **Supabase Setup**
   - Create a new Supabase project
   - Upload AI prompt videos to `storage/feedback_videos/`
   - Set up database tables for feedback and audit logs
   - Configure Row Level Security (RLS) policies

4. **Google Drive API Setup**
   - Create Google Cloud project
   - Enable Drive API
   - Create OAuth 2.0 credentials
   - Add authorized JavaScript origins

5. **Development Server**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_API_KEY=your_google_api_key
```

## 🏗️ Architecture

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── VideoPlayer.tsx
│   ├── ModeSelector.tsx
│   ├── ConsentForm.tsx
│   ├── FeedbackCapture.tsx
│   ├── ProgressIndicator.tsx
│   └── AccessibilityControls.tsx
├── hooks/              # Custom React hooks
│   ├── useVideoProcessing.ts
│   └── useGoogleDrive.ts
├── utils/              # Utility functions
│   ├── validation.ts
│   └── storage.ts
├── types/              # TypeScript interfaces
└── config/             # Configuration files
```

### Data Flow
1. **Welcome Video** → Mode Selection → Consent Collection
2. **Question Videos** (1-5) → User Responses → Validation
3. **Closing Video** → Video Stitching → Drive Upload
4. **Completion** → Session Cleanup → Thank You

### Security Features
- Input sanitization with banned words filter
- Media file validation (size, type, duration)
- CSRF protection through same-origin policy
- Content Security Policy headers
- Rate limiting with cooldown periods

## 🧪 Testing

Run the comprehensive test suite:
```bash
npm run test              # Unit tests
npm run test:integration  # Integration tests
npm run test:a11y        # Accessibility tests
npm run test:coverage    # Coverage report
```

Target: ≥90% test coverage across all modules

## 🚀 Deployment

### Netlify Deployment
```bash
npm run build
# Upload dist/ folder to Netlify
# Configure environment variables in Netlify dashboard
```

### Production Checklist
- [ ] All environment variables configured
- [ ] Supabase RLS policies enabled
- [ ] Google Drive API quotas configured
- [ ] Video files uploaded and accessible
- [ ] SSL certificate active
- [ ] Analytics and monitoring setup

## 🔧 Configuration

### Video Requirements
- **Format**: MP4, optimized for web
- **Total Size**: ≤35MB for all AI videos
- **Individual Size**: ≤7MB per video
- **Resolution**: 720p recommended, 480p minimum
- **Subtitles**: SRT files for accessibility

### Content Moderation
- Text responses: Banned words filter + length limits
- Media files: Type, size, and duration validation
- AI moderation: Optional OpenAI integration
- Manual review: Flagged content workflow

### Performance Monitoring
- Core Web Vitals tracking
- Error logging and alerting
- Upload success/failure rates
- User experience metrics

## 📖 API Documentation

### Google Drive Integration
```typescript
// Upload file to designated folder based on consent
uploadToGoogleDrive(videoBlob, filename, hasConsent)
  .then(result => {
    if (result.success) {
      console.log('Uploaded:', result.fileId);
    }
  });
```

### Video Processing
```typescript
// Stitch AI videos with user responses
stitchVideos(responses, aiVideoUrls)
  .then(finalVideo => {
    // Upload to cloud storage
  });
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create GitHub issue for bugs
- Check documentation for setup help
- Contact team for enterprise support

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Real-time feedback notifications
- [ ] Integration with popular review platforms
- [ ] White-label customization options