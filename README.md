# 🎭 FolkChat — Sri Lankan Folk Artists Social Platform

## 🌟 Overview
**FolkChat** is a social networking platform designed specifically for **Sri Lankan folk artists**.  
It enables artists to **showcase their artwork, build an audience, connect with others, and promote cultural events** in a modern digital space.

The platform combines **social networking, cultural preservation, and AI-powered insights**.

---

## 🚀 Tech Stack

| Category | Technology |
|--------|-----------|
| Framework | React Native 0.84.1 |
| Language | TypeScript |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Media Storage | Cloudinary |
| State Management | Zustand |
| Navigation | React Navigation v7 |
| AI Integration | Groq (Mixtral) |
| Video/Call | Agora |
| Local Storage | AsyncStorage |

---

## 🔐 Authentication Flow

Splash Screen → Onboarding → Login / Sign Up / Forgot Password  

### Features
- Email & Password Authentication  
- Google Sign-In  
- Artist category selection  
- Password reset via email  

---

## 📱 Main Features

### 🏠 Home Feed
- Events bar (horizontal scroll)  
- Notification bell with unread badge  
- Posts feed:
  - Multi-image swiper  
  - Like, Comment, Bookmark  
  - Caption with "Read More"  
  - View count tracking  
  - Author info display  

---

### 🔍 Search
- Posts grid (3-column layout)  
- Artist search & suggestions  
- Follow / Unfollow  
- Post detail modal  

---

### ➕ Upload
- Create Posts:
  - Multiple images  
  - Title, Caption, Category, Techniques  

- Create Events:
  - Title, Description, Location, Date  

---

### 💬 Messages (Real-Time Chat)

#### Features
- Real-time messaging (Firestore)  
- Typing indicator  
- Online / Last Seen status  
- Read receipts (double tick)  

#### Media Support
- Image sharing (Camera / Gallery)  
- Full-screen image viewer  

#### Message Actions
- Edit messages  
- Delete (for me / for everyone)  
- Clear chat  

#### UI Features
- Swipe to delete conversation  
- Unread badges  
- Custom chat themes & wallpapers  

---

### 👤 Profile
- Avatar + Cover image  
- Bio + Artist category  
- Stats (Posts / Followers / Following)  
- Posts grid  

#### Actions
- Edit/Delete posts  
- Follow / Message users  

---

## 🎉 Events System

- Events displayed in Home feed  

### Event Details
- Image, Title, Description  
- Location & Date  

### Interactions
- Mark as Interested  
- Notify organizer  
- View interested users  
- Delete own events  

---

## 🔔 Notifications

- Likes, Comments, Follows  
- Event interest  
- Messages  

### Smart Navigation
- Opens relevant screen on tap  

---

## 📊 Analytics (Pro Feature)

### Metrics
- Likes, Views, Comments, Saves  
- Average per post  

### Engagement Rate
(Likes + Comments + Saves) ÷ Total Views × 100  

- Excellent: > 6%  
- Good: 3% – 6%  
- Average: 1% – 3%  
- Growing: < 1%  

---

## 🤖 AI Growth Tips

- Personalized suggestions using Groq AI  
- Based on user activity and stats  
- Multiple content strategy angles  

---

## 🎨 Theme & Customization

- Light & Dark Mode  
- Cultural color palette  
- Chat themes & wallpapers  

---

## 🌍 Multi-language Support

- English  
- Sinhala (සිංහල)  
- Tamil (தமிழ்)  

---

## ⚙️ Settings

- Theme toggle  
- Language selection  
- Chat customization  
- Notifications control  
- Account management  

---

## 🏗️ Backend Architecture

### Firestore Collections

/users/{uid}  
/posts/{postId}  
/comments/{cmtId}  
/events/{eventId}  
/chats/{chatId}  
/messages/{msgId}  
/notifications/{id}  
/presence/{uid}  

---

## 📦 Storage

- Cloudinary → media files  
- AsyncStorage → local preferences  

---

## 🔒 Security

- Firebase Authentication required  
- Firestore access rules enforced  
- Owner-based permissions  

---

## 🇱🇰 Unique Sri Lankan Features

- Folk art categories  
- Cultural AI suggestions  
- Native language support  
- Traditional-inspired UI colors  

---

## 📞 Real-Time Communication

- Real-time chat using Firestore  
- Image & document messaging  
- Typing indicators & presence tracking  
- Voice & Video Calls via Agora  
