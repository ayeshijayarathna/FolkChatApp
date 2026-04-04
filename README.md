# FolkChat 🎨

A social media platform dedicated to Sri Lankan Folk Artists — built with React Native + Firebase.

![Platform](https://img.shields.io/badge/Platform-Android-green)
![React Native](https://img.shields.io/badge/React_Native-0.84.1-blue)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)

---

## 📱 Features

- **Home Feed** — Instagram-style post feed with likes, comments, bookmarks & share
- **Upload Artwork** — Upload images & videos (up to 10 files per post) via Cloudinary
- **User Profiles** — Cover photo, avatar, bio, follower/following stats
- **Edit Profile** — Update name, bio, artist category, profile & cover photos
- **Authentication** — Email/Password login + Google Sign In
- **Folk Art Categories** — 28+ traditional Sri Lankan art categories
- **Follow System** — Follow/unfollow artists
- **Comments** — Real-time comment system
- **Save Posts** — Bookmark posts, view saved posts in profile
- **Search** — Discover artists and artwork
- **Settings** — Account management, preferences

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native 0.84.1 |
| Language | TypeScript |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Media Storage | Cloudinary |
| State Management | Zustand |
| Navigation | React Navigation v7 |
| Icons | React Native Vector Icons (Ionicons) |
| Video | React Native Video |
| Image Picker | React Native Image Picker |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Android Studio + Android SDK
- JDK 17
- React Native CLI

### Installation

**1. Clone the repository**
```bash
git clone 
cd FolkChatApp
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure Firebase**

- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable **Authentication** (Email/Password + Google)
- Enable **Cloud Firestore**
- Add Android app with package name `com.folkchat`
- Download `google-services.json` and place it in `android/app/`

**4. Configure Cloudinary**

- Create account at [cloudinary.com](https://cloudinary.com)
- Create an **unsigned upload preset**
- Copy `src/services/cloudinary.service.example.ts` to `src/services/cloudinary.service.ts`
- Fill in your `CLOUD_NAME` and `UPLOAD_PRESET`

**5. Configure Google Sign In**

- Copy `src/services/firebase.example.ts` to `src/services/firebase.ts`
- Fill in your **Web Client ID** from Firebase Console → Authentication → Google → Web SDK configuration

**6. Run the app**
```bash
npx react-native run-android
```

---
## ⚠️ Important Notes

- `google-services.json` is **git-ignored** — never commit this file
- `src/services/firebase.ts` is **git-ignored** — contains Web Client ID
- `src/services/cloudinary.service.ts` is **git-ignored** — contains API credentials
- Use the `.example.ts` template files to set up your own credentials

---

## 🎨 Color Palette

| Name | Hex |
|------|-----|
| Saffron | `#D4651A` |
| Clay | `#C4834A` |
| Rust | `#8B3A1A` |
| Ivory | `#F5EFE6` |
| Forest | `#2D5016` |
| Teal | `#1A6B5C` |
| Gold | `#B8860B` |
| Earth | `#5C3D2E` |

---

## 📄 License

MIT License — feel free to use this project for learning purposes.

> *Connecting Artists · Celebrating Culture*