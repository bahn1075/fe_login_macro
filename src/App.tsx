import React, { useState } from 'react';
import './App.css';
import Login from './Login';
import MainApp from './MainApp';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <>
      {isLoggedIn ? (
        <MainApp />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;
