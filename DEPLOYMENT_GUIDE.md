# PHat5 Web Deployment Guide

This guide will help you deploy PHat5 as a web application to various hosting platforms and connect it to your custom domain.

## 🎯 Deployment Overview

PHat5 can be deployed in multiple ways:
1. **Web App** - Full-featured web version with cloud sync
2. **Progressive Web App (PWA)** - Installable web app with offline capabilities
3. **Static Site** - Basic version for simple hosting

## 📋 Prerequisites

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Install PWA plugin
npm install --save-dev vite-plugin-pwa

# Copy environment file
cp .env.example .env
```

### 2. Firebase Configuration (Required)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication and Firestore
4. Get your config values and update `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Create PWA Icons
Create these icon files in the `public/` directory:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)
- `apple-touch-icon.png` (180x180 pixels)
- `favicon.ico` (32x32 pixels)

## 🚀 Deployment Options

### Option 1: Firebase Hosting (Recommended)

**Pros:** 
- Integrated with Firebase backend
- Global CDN
- SSL certificates
- Easy custom domain setup

**Steps:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done)
firebase init hosting

# Build and deploy
npm run deploy:firebase
```

**Custom Domain Setup:**
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. Add these DNS records to your domain:
   - Type: A, Name: @, Value: [Firebase IP]
   - Type: CNAME, Name: www, Value: [your-project].web.app

### Option 2: Netlify

**Pros:**
- Easy GitHub integration
- Automatic deployments
- Built-in forms and functions
- Great performance

**Steps:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build:web:prod

# Deploy to Netlify
npm run deploy:netlify

# Or deploy via drag & drop
# 1. Go to netlify.com
# 2. Drag the dist-web folder to deploy
```

**Custom Domain Setup:**
1. Go to Netlify Dashboard → Domain settings
2. Add custom domain
3. Update your DNS:
   - Type: CNAME, Name: www, Value: [your-site].netlify.app
   - Type: A, Name: @, Value: 75.2.60.5

### Option 3: Vercel

**Pros:**
- Excellent performance
- Edge functions
- GitHub integration
- Global CDN

**Steps:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
npm run deploy:vercel

# Or connect via GitHub
# 1. Go to vercel.com
# 2. Import your GitHub repository
# 3. Configure build settings
```

**Custom Domain Setup:**
1. Go to Vercel Dashboard → Domains
2. Add your domain
3. Update DNS records:
   - Type: CNAME, Name: www, Value: cname.vercel-dns.com
   - Type: A, Name: @, Value: 76.76.19.61

### Option 4: GitHub Pages

**Steps:**
```bash
# Build the project
npm run build:web:prod

# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"deploy:github": "gh-pages -d dist-web"

# Deploy
npm run deploy:github
```

## 🔧 Build Configuration

### Web-Specific Build
```bash
# Development
npm run dev

# Production build for web
npm run build:web:prod

# Preview web build
npm run preview:web
```

### Environment Variables for Production
Create `.env.production`:
```env
NODE_ENV=production
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_production_domain
# ... other production values
```

## 🌐 Domain Configuration

### DNS Records Template
Replace `your-domain.com` with your actual domain:

```
# For Firebase Hosting
Type: A     Name: @     Value: 151.101.1.195
Type: A     Name: @     Value: 151.101.65.195
Type: CNAME Name: www   Value: your-project.web.app

# For Netlify
Type: CNAME Name: www   Value: your-site.netlify.app
Type: A     Name: @     Value: 75.2.60.5

# For Vercel
Type: CNAME Name: www   Value: cname.vercel-dns.com
Type: A     Name: @     Value: 76.76.19.61
```

### SSL Certificate
All recommended platforms provide automatic SSL certificates. Your site will be available at:
- `https://your-domain.com`
- `https://www.your-domain.com`

## 📱 Progressive Web App Features

The web version includes PWA capabilities:
- **Installable** - Users can install it like a native app
- **Offline Support** - Basic functionality works offline
- **Push Notifications** - For playlist sharing and updates
- **App-like Experience** - Full-screen, no browser UI

## 🔍 Testing Your Deployment

### Pre-deployment Checklist
- [ ] Firebase configuration is correct
- [ ] Environment variables are set
- [ ] PWA icons are created
- [ ] Build completes without errors
- [ ] All features work in production build

### Post-deployment Testing
1. **Basic Functionality**
   - Create account / sign in
   - Upload audio files
   - Create playlists
   - Play music

2. **PWA Features**
   - Install prompt appears
   - Works offline (basic features)
   - Responsive on mobile

3. **Performance**
   - Page load speed < 3 seconds
   - Audio playback is smooth
   - No console errors

## 🚨 Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version (18+ required)
- Clear node_modules and reinstall
- Check for TypeScript errors

**Firebase Connection Issues:**
- Verify environment variables
- Check Firebase project settings
- Ensure Firestore rules allow access

**Audio Not Playing:**
- Check browser audio permissions
- Verify file formats are supported
- Test with different browsers

**PWA Not Installing:**
- Ensure HTTPS is enabled
- Check manifest.json is valid
- Verify service worker is registered

## 📊 Analytics and Monitoring

### Firebase Analytics
Already configured in your Firebase project. View metrics at:
- Firebase Console → Analytics

### Performance Monitoring
- Use Lighthouse for performance audits
- Monitor Core Web Vitals
- Set up error tracking with Firebase Crashlytics

## 🔄 Continuous Deployment

### GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build:web:prod
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the troubleshooting section
3. Check browser console for errors
4. Create an issue on GitHub with details

---

**Next Steps:** Choose your preferred hosting platform and follow the deployment steps above!
