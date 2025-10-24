# IPFS Deployment Guide for we3chat

This guide covers deploying the we3chat application to IPFS for decentralized hosting.

## 🎯 Overview

The we3chat application is designed to be statically hosted on IPFS, making it truly decentralized and censorship-resistant. The same IPFS CID can point to different backend configurations without requiring a new build.

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- IPFS node or access to IPFS services
- Supabase project configured
- Ceramic network access

## 🏗️ Build Process

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with:
- Optimized JavaScript bundles
- CSS files
- Static assets
- `config.json` for runtime configuration

### 2. Verify Build Output

```bash
# Preview the build locally
npm run preview
```

Ensure the application works correctly with the production build.

## 🌐 IPFS Deployment Options

### Option 1: Using ipfs-deploy (Recommended)

```bash
# Install globally
npm install -g ipfs-deploy

# Deploy to IPFS
npx ipfs-deploy dist

# Or use the npm script
npm run deploy:ipfs
```

This will:
- Upload the `dist/` folder to IPFS
- Return the IPFS hash (CID)
- Provide gateway URLs for access

### Option 2: Using Pinata

```bash
# Install Pinata CLI
npm install -g pinata-cli

# Configure with your API keys
pinata-cli config

# Upload to Pinata
npx pinata-cli upload dist

# Or use the npm script
npm run deploy:pinata
```

### Option 3: Using Web3.Storage

```bash
# Install Web3.Storage CLI
npm install -g @web3-storage/cli

# Login to Web3.Storage
w3 login

# Upload to Web3.Storage
w3 put dist
```

### Option 4: Manual Upload

1. **Using IPFS Desktop**:
   - Open IPFS Desktop
   - Click "Add" → "Folder"
   - Select the `dist/` folder
   - Copy the resulting hash

2. **Using IPFS CLI**:
   ```bash
   # Add folder to IPFS
   ipfs add -r dist
   
   # Pin the content
   ipfs pin add <CID>
   ```

3. **Using IPFS Web UI**:
   - Go to your IPFS node's web interface
   - Upload the `dist/` folder
   - Copy the CID

## 🔧 Configuration Management

### Runtime Configuration

The application uses `public/config.json` for runtime configuration:

```json
{
  "supabase": {
    "url": "https://your-project.supabase.co",
    "anonKey": "your-supabase-anon-key"
  },
  "ceramic": {
    "network": "testnet-clay",
    "nodeUrl": "https://ceramic-clay.3boxlabs.com"
  },
  "app": {
    "name": "we3chat",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### Environment-Specific Configurations

You can deploy the same IPFS CID with different configurations:

1. **Development**: Use local Supabase and Ceramic testnet
2. **Staging**: Use staging Supabase and Ceramic testnet
3. **Production**: Use production Supabase and Ceramic mainnet

### Updating Configuration

To update configuration without rebuilding:

1. Modify `public/config.json`
2. Re-upload to IPFS
3. Update your domain/gateway to point to the new CID

## 🌍 Accessing Your Deployed App

### IPFS Gateway URLs

Once deployed, your app is accessible via:

- **IPFS.io**: `https://ipfs.io/ipfs/YOUR_CID`
- **Cloudflare**: `https://cloudflare-ipfs.com/ipfs/YOUR_CID`
- **Pinata**: `https://gateway.pinata.cloud/ipfs/YOUR_CID`
- **Local Gateway**: `http://localhost:8080/ipfs/YOUR_CID`

### Custom Domain Setup

You can set up a custom domain:

1. **Using IPNS**:
   ```bash
   # Create IPNS record
   ipfs name publish YOUR_CID
   
   # Access via: https://ipfs.io/ipns/YOUR_IPNS_KEY
   ```

2. **Using DNSLink**:
   ```dns
   # Add TXT record to your domain
   _dnslink.yourdomain.com TXT "dnslink=/ipfs/YOUR_CID"
   
   # Access via: https://yourdomain.com
   ```

3. **Using Cloudflare**:
   - Set up Cloudflare Pages
   - Configure custom domain
   - Point to IPFS gateway

## 🔄 Update Process

### Updating the Application

1. **Make Changes**: Update your code
2. **Build**: `npm run build`
3. **Deploy**: Upload new `dist/` to IPFS
4. **Update**: Point your domain/gateway to new CID

### Rolling Back

If you need to roll back:

1. **Find Previous CID**: Check your deployment history
2. **Update Gateway**: Point back to previous CID
3. **Verify**: Test the rollback

## 📊 Monitoring & Analytics

### IPFS Metrics

Monitor your deployment:

- **Pin Status**: Ensure content is pinned
- **Gateway Performance**: Check response times
- **Access Logs**: Monitor usage patterns

### Application Metrics

Track application performance:

- **Error Rates**: Monitor JavaScript errors
- **Load Times**: Track initial load performance
- **User Engagement**: Monitor chat activity

## 🛡️ Security Considerations

### Content Integrity

- **Hash Verification**: Verify IPFS hashes match expected values
- **Pin Management**: Ensure content remains pinned
- **Gateway Security**: Use trusted IPFS gateways

### Application Security

- **HTTPS Only**: Always use HTTPS for production
- **CSP Headers**: Implement Content Security Policy
- **Environment Variables**: Never expose sensitive keys

## 🚨 Troubleshooting

### Common Issues

1. **Content Not Loading**:
   - Check if content is pinned
   - Verify gateway is accessible
   - Check browser console for errors

2. **Configuration Errors**:
   - Verify `config.json` format
   - Check Supabase/Ceramic connectivity
   - Validate API keys

3. **Performance Issues**:
   - Optimize bundle size
   - Use CDN for static assets
   - Implement caching strategies

### Debug Mode

Enable debug mode in production:

```json
{
  "app": {
    "environment": "production",
    "debug": true
  }
}
```

## 📈 Optimization Tips

### Bundle Size

- **Code Splitting**: Implement route-based code splitting
- **Tree Shaking**: Remove unused code
- **Compression**: Enable gzip/brotli compression

### Performance

- **Lazy Loading**: Load components on demand
- **Caching**: Implement proper caching headers
- **CDN**: Use CDN for static assets

### IPFS Specific

- **Pin Strategy**: Pin frequently accessed content
- **Gateway Selection**: Choose fast, reliable gateways
- **Content Addressing**: Use efficient content addressing

## 🔗 Useful Links

- [IPFS Documentation](https://docs.ipfs.io/)
- [Pinata Documentation](https://docs.pinata.cloud/)
- [Web3.Storage Documentation](https://web3.storage/docs/)
- [Ceramic Documentation](https://developers.ceramic.network/)
- [Supabase Documentation](https://supabase.com/docs)

## 📞 Support

If you encounter issues with deployment:

1. Check the troubleshooting section above
2. Review IPFS gateway logs
3. Verify configuration settings
4. Contact support: support@we3chat.com

---

**Happy Deploying! 🚀**
