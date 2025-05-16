import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import NewAlarmScreen from './screens/NewAlarmScreen';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#60a5fa',       
    background: '#f0f9ff',    
    card: '#fff',              
    text: '#1e3a8a',           
    border: 'rgba(147,197,253,0.3)', 
  },
};

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',          
            elevation: 4,                     
            shadowColor: '#2563eb',           
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          },
          headerTintColor: '#1e3a8a',         
          headerTitleStyle: {
            fontWeight: '800',                
            fontSize: 20,
          },
          headerBackTitleStyle: {
            fontSize: 16,
          },
          cardStyle: { backgroundColor: '#f0f9ff' }, 
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }} 
        />
        <Stack.Screen 
          name="NewAlarm" 
          component={NewAlarmScreen} 
          options={{ title: 'New Alarm' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
