#!/bin/bash

# We3Chat GitHub Setup Script
# This script helps set up the repository for GitHub upload

echo "🚀 We3Chat GitHub Setup Script"
echo "================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# Check if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "✅ Remote origin already configured"
    echo "📍 Repository: $(git remote get-url origin)"
else
    echo "🔗 Setting up remote origin..."
    git remote add origin https://github.com/deekshith-b48/we3chat.git
    echo "✅ Remote origin configured"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo ""
    read -p "Do you want to commit these changes? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "✅ Changes committed"
    else
        echo "⚠️  Skipping uncommitted changes"
    fi
fi

# Check if we can push
echo "🔄 Attempting to push to GitHub..."
if git push -u origin $CURRENT_BRANCH; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Repository: https://github.com/deekshith-b48/we3chat"
else
    echo "❌ Failed to push to GitHub"
    echo ""
    echo "🔧 Manual setup required:"
    echo "1. Go to https://github.com/deekshith-b48/we3chat"
    echo "2. Copy the repository URL"
    echo "3. Run: git remote set-url origin <repository-url>"
    echo "4. Run: git push -u origin $CURRENT_BRANCH"
    echo ""
    echo "📋 Or use GitHub Desktop/GitKraken for easier setup"
fi

echo ""
echo "📚 Next Steps:"
echo "1. Visit: https://github.com/deekshith-b48/we3chat"
echo "2. Check the DEVELOPMENT_STATUS.md for current progress"
echo "3. Review README.md for setup instructions"
echo "4. Start development with: npm run dev"
echo ""
echo "🎉 We3Chat is ready for development!"
