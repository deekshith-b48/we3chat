# 🚀 We3Chat Quick Start Guide

This guide will get you up and running with We3Chat authentication in **under 5 minutes**!

## ⚡ Quick Setup

### 1. **Backend Setup**

```bash
cd backend
npm install
```

Create a `.env` file:
```bash
cp env.example .env
```

Edit `.env` with minimal required values:
```env
# Required
SIWE_JWT_SECRET=your-super-long-random-string-at-least-32-characters-change-this-in-production

# Optional (defaults work for development)
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
SIWE_DOMAIN=localhost
SIWE_ORIGIN=http://localhost:3000
SIWE_STATEMENT=Sign in with Ethereum to We3Chat
```

Start the backend:
```bash
npm run dev
```

### 2. **Frontend Setup**

```bash
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

### 3. **Test Authentication**

Go to: `http://localhost:3000/test-auth`

## 🎯 What Works Right Now

### ✅ **Email Authentication**
- Sign up with email/password
- Sign in with email/password
- Session management with cookies

### ✅ **Wallet Authentication**
- Connect MetaMask wallet
- Sign messages with SIWE (Sign-In With Ethereum)
- Secure session management

### ✅ **No Database Required**
- Uses in-memory storage for demo
- No Supabase setup needed
- Works immediately

## 🧪 Testing

### **Test Email Auth:**
1. Go to `http://localhost:3000/test-auth`
2. Click "Don't have an account? Sign Up"
3. Enter email, password, username
4. Click "Sign Up"
5. You should see a success message!

### **Test Wallet Auth:**
1. Make sure MetaMask is installed
2. Go to `http://localhost:3000/test-auth`
3. Click "Connect Wallet"
4. Approve connection in MetaMask
5. Enter username (optional)
6. Click "Sign In with Wallet"
7. Sign the message in MetaMask
8. You should see a success message!

## 🔧 API Endpoints

The backend provides these endpoints:

- `POST /api/auth/email/signup` - Email signup
- `POST /api/auth/email/login` - Email login
- `POST /api/auth/email/logout` - Logout
- `GET /api/auth/siwe/nonce?address=0x...` - Get wallet nonce
- `POST /api/auth/siwe/verify` - Verify wallet signature
- `GET /api/auth/me` - Get current user
- `GET /api/auth/health` - Health check

## 🎉 Success!

You now have a **working authentication system** that supports:

- ✅ **Email/Password authentication**
- ✅ **Wallet authentication** (SIWE)
- ✅ **Session management**
- ✅ **Secure cookies**
- ✅ **No external dependencies**

## 🚀 Next Steps

1. **Test both authentication methods**
2. **Customize the UI** in `src/components/SimpleLogin.tsx`
3. **Add your own features** using the `useBasicAuth` hook
4. **Deploy to production** when ready

## 🐛 Troubleshooting

### **"Missing required environment variable"**
- Make sure `SIWE_JWT_SECRET` is set in `backend/.env`
- Must be at least 32 characters long

### **"Wallet not connected"**
- Make sure MetaMask is installed and unlocked
- Try refreshing the page

### **"CORS error"**
- Make sure backend is running on port 5000
- Check `CORS_ORIGIN` in backend `.env`

### **"Failed to get nonce"**
- Make sure backend is running
- Check browser console for errors

## 📱 Using in Your App

```typescript
import { useBasicAuth } from '@/hooks/use-basic-auth';

function MyComponent() {
  const {
    user,
    isLoading,
    error,
    isAuthenticated,
    signInWithEmail,
    signInWithWallet,
    signOut
  } = useBasicAuth();

  if (isLoading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => signInWithEmail('user@example.com', 'password')}>
          Sign In with Email
        </button>
        <button onClick={() => signInWithWallet()}>
          Sign In with Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user?.username || user?.email || user?.wallet}!</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## 🎯 That's It!

Your We3Chat authentication system is now **fully functional**! 🚀

No complex database setup, no external dependencies, just pure authentication that works immediately.
