import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; // Gece/Gündüz ikonları için
import { useState } from 'react';

const SettingsScreen = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  // Gece/Gündüz modunu kaydırmalı yapma fonksiyonu
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  return (
    <View style={[styles.container, { backgroundColor: isEnabled ? '#333' : '#FFF' }]}>
      <Text style={[styles.title, { color: isEnabled ? '#FFF' : '#333' }]}>Ayarlar</Text>
      
      {/* Gece/Gündüz Modu Switch'i */}
      <View style={styles.switchContainer}>
        <Switch
          trackColor={{ false: '#767577', true: '#66bb6a' }} // Yeşil tonunda aktif track
          thumbColor={isEnabled ? '#43a047' : '#f4f3f4'} // Yeşil tonunda aktif thumb
          onValueChange={toggleSwitch}
          value={isEnabled}
          style={styles.switch} 
        />
        
        {/* Aktif olan tarafta tik ikonunu göster */}
        <View style={styles.iconContainer}>
          {isEnabled ? (
            <>
              <MaterialIcons
                name="nights-stay"
                size={20} // Küçültülmüş ikon boyutu
                color="#43a047"
              />
            </>
          ) : (
            <>
              <MaterialIcons
                name="wb-sunny"
                size={20} // Küçültülmüş ikon boyutu
                color="#FFB74D"
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    right: 20, // Sağ üst köşe
  },
  switch: {
    marginRight: 10, // İkon ve Switch arasındaki boşluk
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsScreen;
