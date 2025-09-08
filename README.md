# 🎓 Campus Lost & Found - Your Ultimate Campus Companion

A comprehensive React Native mobile application built with Expo that serves as the ultimate campus companion for students. This app combines lost & found functionality, peer-to-peer marketplace, study collaboration tools, and secure messaging in one unified platform.

## 🌟 What is Campus Lost & Found?

Campus Lost & Found is a feature-rich mobile application designed specifically for campus life. It helps students find lost items, buy/sell with classmates, share study resources, and connect safely through integrated chat functionality.

### Key Features

#### 🔍 **Smart Lost & Found System**
- Location-based lost item tracking with interactive maps
- Photo upload and detailed item descriptions
- Campus-specific communities and trending items

#### 🛍️ **Peer-to-Peer Marketplace**
- Buy and sell with fellow students in a trusted environment
- Image uploads and detailed product listings
- Integrated chat for buyer-seller communication

#### 📚 **Study Hub & Collaboration**
- Share notes, projects, and study materials
- Resource library with search and categorization

#### 💬 **Secure Messaging System**
- Private chat with buyers, sellers, and study partners
- Privacy controls and reporting features
- Real-time messaging with message history
- User verification and safety measures

## 🏗️ Technical Architecture

### **Frontend**
- **Framework**: React Native with Expo SDK
- **Navigation**: Expo Router with file-based routing
- **UI Components**: Custom components with LinearGradient styling
- **State Management**: React Context (AuthContext)
- **Maps**: React Native Maps with Google Maps integration
- **Image Handling**: Expo Image Picker and Firebase Storage

### **Backend Services**
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage for images
- **Real-time Updates**: Firestore real-time listeners

### **Platform Support**
- iOS (with Google Maps integration)
- Android (with Google Maps integration)
- Web (via React Native Web)

## 📱 App Structure

```
app/
├── _layout.tsx              # Root navigation and auth routing
├── index.tsx                # Landing page with app overview
├── (auth)/                  # Authentication flow
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── (tabs)/                  # Main application tabs
    ├── _layout.tsx
    ├── home.tsx             # Dashboard with feature overview
    ├── map.tsx              # Lost & Found with interactive maps
    ├── marketplace.tsx      # Buy/Sell marketplace
    ├── projects.tsx         # Study hub and collaboration
    ├── chat.tsx             # Secure messaging
    └── profile.tsx          # User profile management
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vitBuddy/login
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Set up a Firebase project
   - Enable Authentication and Firestore
   - Add your Firebase configuration to `firbase.config.ts`
   - Configure Google Maps API keys in `app.json`

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your preferred platform**
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go
   - **Web**: Press `w` in the terminal

## 🔧 Configuration

### Environment Variables
The app uses Firebase configuration and Google Maps API keys. Make sure to:

1. **Firebase Setup**:
   - Create a Firebase project
   - Enable Authentication (Email/Password and Google Sign-In)
   - Enable Firestore Database
   - Add your web app configuration to `firbase.config.ts`

2. **Google Maps API**:
   - Get Google Maps API key
   - Update `app.json` with your API key for both iOS and Android

### Permissions
The app requires the following permissions:
- **Location**: For map functionality and location-based lost items
- **Camera/Photo Library**: For uploading item images
- **Notifications**: For real-time updates and matches


## 🛡️ Security Features

- Firebase Authentication with multiple sign-in methods
- Secure Firestore rules for data protection
- User verification and profile validation
- Privacy controls in messaging system
- Report and block functionality

## 🎨 UI/UX Highlights

- Modern gradient-based design
- Smooth animations and transitions
- Intuitive tab-based navigation
- Responsive design for all screen sizes
- Dark/light mode support
- Accessibility considerations

## 🔮 Future Enhancements

- Push notifications for real-time updates
- Advanced AI matching algorithms
- Payment integration for marketplace
- Study group video calls
- Campus event integration
- Analytics dashboard for administrators

## 📚 Learning Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ for the campus community**
