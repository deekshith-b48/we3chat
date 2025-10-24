import { useState } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { messageEncryption } from '@/lib/messageEncryption';

export function UserRegistration() {
  const { registerUser, account, isLoading } = useWeb3ChatStore();
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    avatarCid: ''
  });
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [publicKey, setPublicKey] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateKeyPair = async () => {
    setIsGeneratingKey(true);
    try {
      const key = await messageEncryption.getPublicKey();
      setPublicKey(key);
    } catch (error) {
      console.error('Failed to generate key pair:', error);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      alert('Please generate a key pair first');
      return;
    }

    try {
      await registerUser(formData.username, formData.bio, formData.avatarCid, publicKey);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
        <p className="text-gray-600">
          Set up your profile to start using the decentralized chat
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell us about yourself"
          />
        </div>

        <div>
          <label htmlFor="avatarCid" className="block text-sm font-medium text-gray-700 mb-1">
            Avatar IPFS CID
          </label>
          <input
            type="text"
            id="avatarCid"
            name="avatarCid"
            value={formData.avatarCid}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional: IPFS CID for your avatar"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Encryption Key
          </label>
          <div className="space-y-2">
            {publicKey ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-800 font-medium mb-1">Key Generated</div>
                <div className="text-xs text-green-600 font-mono break-all">
                  {publicKey.slice(0, 20)}...{publicKey.slice(-20)}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={generateKeyPair}
                disabled={isGeneratingKey}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingKey ? 'Generating...' : 'Generate Key Pair'}
              </button>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || !publicKey || !formData.username.trim()}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Registering...' : 'Complete Registration'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Your data is secure</div>
            <div className="text-blue-600">
              Your encryption key is generated locally and never leaves your device. 
              All messages are encrypted end-to-end.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
