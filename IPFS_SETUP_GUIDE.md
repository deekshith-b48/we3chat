# IPFS Setup Guide for We3Chat

This guide will help you set up free IPFS storage for We3Chat using multiple free services.

## Free IPFS Services

### 1. Pinata (Recommended)
- **Free Tier**: 1GB storage + 1GB bandwidth per month
- **Setup**:
  1. Go to [pinata.cloud](https://pinata.cloud/)
  2. Sign up for free account
  3. Get API key and secret from dashboard
  4. Add to your `.env.local` file

### 2. Public IPFS Gateway (Fallback)
- **Free Tier**: Unlimited (but not persistent)
- **Setup**: No setup required, works out of the box

### 3. Local Storage (Backup)
- **Free Tier**: Limited by device storage
- **Setup**: Automatically enabled as fallback

## Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# IPFS Configuration (Free Services)
# Pinata - Get free API keys at https://pinata.cloud/
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key_here
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key_here

# IPFS Gateway (optional)
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs

# Feature Flags
NEXT_PUBLIC_ENABLE_IPFS=true
```

## How It Works

1. **Multiple Providers**: The app tries multiple IPFS providers in order of preference
2. **Automatic Fallback**: If one provider fails, it automatically tries the next one
3. **Local Storage Backup**: If all IPFS providers fail, messages are stored locally as backup
4. **Decentralized Storage**: Messages are stored on IPFS for censorship resistance

## Provider Priority

1. **Pinata** (if API keys configured)
2. **Public Gateway** (always available as fallback)
3. **Local Storage** (backup when all else fails)

## Features

- ✅ **Free IPFS Storage**: Uses multiple free services
- ✅ **Automatic Failover**: Falls back to next provider if one fails
- ✅ **Decentralized**: Messages stored on IPFS network
- ✅ **Censorship Resistant**: Content can't be easily removed
- ✅ **Bandwidth Efficient**: Only uploads when needed
- ✅ **Real-time Sync**: Messages sync across all devices

## Testing IPFS Integration

1. Start the application
2. Open browser console
3. Look for IPFS provider status logs
4. Send a message to see IPFS upload logs
5. Check the IPFS URL in the console for verification

## Troubleshooting

### No IPFS Providers Available
- Check your environment variables
- Ensure API tokens are valid
- Check console for error messages

### Upload Failures
- Verify API tokens are correct
- Check network connectivity
- Try refreshing the page

### Download Failures
- Content might be temporarily unavailable
- Try again after a few seconds
- Check IPFS gateway status

## Cost Breakdown

- **Pinata**: 1GB free per month
- **Public Gateway**: Unlimited (but not persistent)
- **Local Storage**: Limited by device storage
- **Total Free Storage**: 1GB+ per month
- **Bandwidth**: 1GB+ free per month

This should be sufficient for personal use and small team deployments.
