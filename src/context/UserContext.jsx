import { createContext, useContext, useState, useEffect } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [userId, setUserIdState] = useState(null);
  const [username, setUsernameState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // App khulte hi saved login load karo
 useEffect(() => {
  const savedUserId = localStorage.getItem("userId");
  const savedUsername = localStorage.getItem("username");

  if (savedUserId) setUserIdState(parseInt(savedUserId, 10));
  if (savedUsername) setUsernameState(savedUsername);

  setIsLoading(false);
}, []);

const setUserId = (id) => {
  setUserIdState(id);

  if (id) {
    localStorage.setItem("userId", id.toString());
  } else {
    localStorage.removeItem("userId");
  }
};

 const setUsername = (name) => {
  setUsernameState(name);

  if (name) {
    localStorage.setItem("username", name);
  } else {
    localStorage.removeItem("username");
  }
};

const logout = () => {
  setUserIdState(null);
  setUsernameState(null);

  localStorage.removeItem("userId");
  localStorage.removeItem("username");
};

  return (
    <UserContext.Provider value={{ userId, setUserId, username, setUsername, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}