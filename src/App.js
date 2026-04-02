// Root App component
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import AuthScreen from './components/Auth/AuthScreen';
import ChatInterface from './components/Chat/ChatInterface';
import { db } from './utils/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const [users, setUsers] = useState([]);

  // Listen for all users in real-time
  useEffect(() => {
    if (!user) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        usersList.push({
          uid: doc.id,
          ...doc.data()
        });
      });
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4caf50',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {!user ? (
        <AuthScreen onGoogleSignIn={signInWithGoogle} loading={loading} />
      ) : (
        <ChatInterface
          currentUser={user}
          users={users}
          onLogout={logout}
        />
      )}
    </>
  );
}

export default App;