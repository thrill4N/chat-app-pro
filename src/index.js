// the application entry point
// Application entry point - Renders the root React component
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS imports
import App from './App';

// Create root element and render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);