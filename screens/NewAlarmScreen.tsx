import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Switch
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const AlarmApp = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isTimeEnabled, setIsTimeEnabled] = useState(true);
  const [initialRegion, setInitialRegion] = useState(null);
  const mapRef = useRef(null);
  const soundRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum izni reddedildi', 'Konum özelliğini kullanabilmek için izin vermeniz gerekiyor.');
        return;
      }

      const location = await Location.getCurrentPositionAsync();
      setCurrentLocation(location.coords);
      setSelectedLocation(location.coords);
      setInitialRegion({
        ...location.coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (newLocation) => {
          setCurrentLocation(newLocation.coords);
          checkAlarms(newLocation.coords);
        }
      );

      return () => {
        locationSubscription.remove();
        if (soundRef.current) {
          soundRef.current.unloadAsync();
        }
      };
    })();
  }, []);

  const checkAlarms = (coords) => {
    const now = new Date();
    alarms.forEach(alarm => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        alarm.latitude,
        alarm.longitude
      );

      let shouldTrigger = false;
      
      if (alarm.timeEnabled) {
        const alarmTime = new Date(alarm.time);
        shouldTrigger = now.getHours() === alarmTime.getHours() && 
                       now.getMinutes() === alarmTime.getMinutes() &&
                       distance < 100;
      } else {
        shouldTrigger = distance < 100;
      }

      if (shouldTrigger) {
        playAlarm();
        Alert.alert('Alarm!', `${alarm.name} konumuna ulaştınız!`);
      }
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const playAlarm = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/alarm.mp3')
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Alarm çalma hatası:', error);
    }
  };

  const addAlarm = () => {
    if (alarmTitle.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir alarm başlığı girin.');
      return;
    }

    const newAlarm = {
      id: Math.random().toString(),
      name: alarmTitle,
      time: selectedTime.toISOString(),
      timeEnabled: isTimeEnabled,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    };

    setAlarms([...alarms, newAlarm]);
    setModalVisible(false);
    setAlarmTitle('');
    setSelectedTime(new Date());
    setIsTimeEnabled(true);
  };

  const deleteAlarm = (alarmId) => {
    setAlarms(alarms.filter(alarm => alarm.id !== alarmId));
  };

  const centerToUserLocation = async () => {
    if (!currentLocation) return;
    
    mapRef.current.animateToRegion({
      ...currentLocation,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

  const renderRightActions = (progress, dragX, alarmId) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => deleteAlarm(alarmId)}
    >
      <Text style={styles.deleteButtonText}>Sil</Text>
    </TouchableOpacity>
  );

  const renderAlarmItem = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => 
        renderRightActions(progress, dragX, item.id)
      }
    >
      <View style={styles.alarmItem}>
        <Text style={styles.alarmTitle}>{item.name}</Text>
        <Text style={styles.alarmDetails}>
          {item.timeEnabled ? 
            new Date(item.time).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Sürekli Alarm'
          }
        </Text>
        <Text style={styles.alarmDetails}>
          Konum: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
        </Text>
      </View>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      {initialRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
        >
          {selectedLocation && <Marker coordinate={selectedLocation} />}
          {currentLocation && (
            <Marker coordinate={currentLocation} pinColor="blue" />
          )}
        </MapView>
      )}

      <TouchableOpacity 
        style={styles.locateButton}
        onPress={centerToUserLocation}
      >
        <Ionicons name="locate" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Alarm Ekle</Text>
        </TouchableOpacity>

        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={renderAlarmItem}
          style={styles.alarmList}
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Alarm</Text>

            <View style={styles.switchContainer}>
              <Text style={styles.inputLabel}>Zamanlı Alarm</Text>
              <Switch
                value={isTimeEnabled}
                onValueChange={setIsTimeEnabled}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Alarm Adı</Text>
              <TextInput
                style={styles.input}
                value={alarmTitle}
                onChangeText={setAlarmTitle}
                placeholder="Alarm adını girin"
              />
            </View>

            {isTimeEnabled && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Alarm Saati</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {selectedTime.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={addAlarm}
              >
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  İptal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            setShowTimePicker(false);
            if (date) setSelectedTime(date);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alarmList: {
    marginTop: 10,
  },
  alarmItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  alarmTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  alarmDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#333',
  },
});

export default AlarmApp;