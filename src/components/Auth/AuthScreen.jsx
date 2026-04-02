// Main authentication screen component
import React, { useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import GoogleAuth from './GoogleAuth';
import Loader from '../Common/Loader';

/**
 * Authentication Screen Component
 * @param {Object} props - Component props
 * @param {Function} props.onGoogleSignIn - Google sign in handler
 * @param {boolean} props.loading - Loading state
 */
const AuthScreen = ({ onGoogleSignIn, loading }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 hover:scale-105">
          {/* Decorative Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mt-16 -mr-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -mb-12 -ml-12"></div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <MessageCircle className="w-12 h-12" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to ChatApp</h1>
              <p className="text-purple-100">Connect with friends in real-time</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Get Started</h2>
              <p className="text-gray-500">Sign in to start chatting with your friends</p>
            </div>

            {/* Features List */}
            <div className="space-y-3 mb-8">
              {[
                '💬 Real-time messaging',
                '🎨 Custom profile avatars',
                '📱 Mobile responsive',
                '🔒 Secure authentication'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-600">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Google Sign In Button */}
            <GoogleAuth onClick={onGoogleSignIn} loading={loading} />

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Secure & Free</span>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Loader />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;