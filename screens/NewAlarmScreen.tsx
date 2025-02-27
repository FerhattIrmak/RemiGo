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
  Switch,
  ActivityIndicator,
  Platform
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALARMS_STORAGE_KEY = '@location_alarms';

const AlarmApp = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isTimeEnabled, setIsTimeEnabled] = useState(true);
  const [initialRegion, setInitialRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proximityRadius, setProximityRadius] = useState(100); // Metre cinsinden
  const [editMode, setEditMode] = useState(false);
  const [editAlarmId, setEditAlarmId] = useState(null);
  const [androidTimePickerMode, setAndroidTimePickerMode] = useState(false);
  const mapRef = useRef(null);
  const soundRef = useRef(null);

  // AsyncStorage'dan alarmları yükleme
  useEffect(() => {
    const loadAlarms = async () => {
      try {
        const savedAlarms = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
        if (savedAlarms !== null) {
          setAlarms(JSON.parse(savedAlarms));
        }
      } catch (error) {
        console.error('Alarmlar yüklenirken hata oluştu:', error);
        Alert.alert('Hata', 'Kaydedilmiş alarmlar yüklenemedi.');
      }
    };

    loadAlarms();
  }, []);

  // Alarmları AsyncStorage'a kaydetme
  useEffect(() => {
    const saveAlarms = async () => {
      try {
        await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
      } catch (error) {
        console.error('Alarmlar kaydedilirken hata oluştu:', error);
        Alert.alert('Hata', 'Alarmlar cihaza kaydedilemedi.');
      }
    };

    if (alarms.length > 0) {
      saveAlarms();
    }
  }, [alarms]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Konum izni reddedildi', 'Konum özelliğini kullanabilmek için izin vermeniz gerekiyor.');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest
        });
        
        setCurrentLocation(location.coords);
        setSelectedLocation(location.coords);
        setInitialRegion({
          ...location.coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        const locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
          (newLocation) => {
            setCurrentLocation(newLocation.coords);
            checkAlarms(newLocation.coords);
          }
        );

        setLoading(false);

        return () => {
          locationSubscription.remove();
          if (soundRef.current) {
            soundRef.current.unloadAsync();
          }
        };
      } catch (error) {
        console.error('Konum alma hatası:', error);
        Alert.alert('Hata', 'Konum bilgisi alınamadı.');
        setLoading(false);
      }
    })();
  }, []);

  const checkAlarms = (coords) => {
    const now = new Date();
    const triggeredAlarms = [];
    
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
        const timeDifference = Math.abs(
          now.getHours() * 60 + now.getMinutes() - 
          (alarmTime.getHours() * 60 + alarmTime.getMinutes())
        );
        
        // Zaman yakınsa (1 dakika içinde) ve belirtilen mesafe içindeyse
        shouldTrigger = timeDifference <= 1 && distance < alarm.radius;
      } else {
        // Sadece konum tabanlı alarm - mesafe içindeyse
        shouldTrigger = distance < alarm.radius;
      }

      if (shouldTrigger && !activeAlarms.includes(alarm.id)) {
        triggeredAlarms.push(alarm.id);
        playAlarm();
        Alert.alert(
          'Alarm!', 
          `${alarm.name} konumuna ulaştınız!`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                stopAlarm();
                // Tek seferlik alarmsa sil
                if (alarm.oneTime) {
                  deleteAlarm(alarm.id);
                }
              }
            }
          ]
        );
      } else if (distance >= alarm.radius && activeAlarms.includes(alarm.id)) {
        // Artık mesafe dışındaysa aktif alarmlardan çıkar
        setActiveAlarms(prev => prev.filter(id => id !== alarm.id));
      }
    });

    if (triggeredAlarms.length > 0) {
      setActiveAlarms(prev => [...prev, ...triggeredAlarms]);
    }
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
    return R * c * 1000; // Metre cinsinden mesafe
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const playAlarm = async () => {
    try {
      // Önceki alarm sesi varsa durdur
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        require('./assets/alarm.mp3'),
        { isLooping: true } // Alarm duruncaya kadar çalsın
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Alarm çalma hatası:', error);
      Alert.alert('Hata', 'Alarm sesi çalınamadı.');
    }
  };

  const stopAlarm = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
    }
  };

  const saveAlarm = () => {
    if (alarmTitle.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir alarm başlığı girin.');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Uyarı', 'Lütfen haritadan bir konum seçin.');
      return;
    }

    if (editMode && editAlarmId) {
      // Mevcut alarmı güncelle
      setAlarms(alarms.map(alarm => 
        alarm.id === editAlarmId ? {
          ...alarm,
          name: alarmTitle,
          time: selectedTime.toISOString(),
          timeEnabled: isTimeEnabled,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          radius: proximityRadius,
        } : alarm
      ));
    } else {
      // Yeni alarm ekle
      const newAlarm = {
        id: Math.random().toString(),
        name: alarmTitle,
        time: selectedTime.toISOString(),
        timeEnabled: isTimeEnabled,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius: proximityRadius,
        oneTime: false, // Tek seferlik mi? (varsayılan: hayır)
        createdAt: new Date().toISOString()
      };

      setAlarms([...alarms, newAlarm]);
    }

    resetModalState();
  };

  const resetModalState = () => {
    setModalVisible(false);
    setAlarmTitle('');
    setSelectedTime(new Date());
    setIsTimeEnabled(true);
    setProximityRadius(100);
    setEditMode(false);
    setEditAlarmId(null);
  };

  const editAlarm = (alarm) => {
    setAlarmTitle(alarm.name);
    setSelectedTime(new Date(alarm.time));
    setIsTimeEnabled(alarm.timeEnabled);
    setSelectedLocation({
      latitude: alarm.latitude,
      longitude: alarm.longitude
    });
    setProximityRadius(alarm.radius || 100);
    setEditMode(true);
    setEditAlarmId(alarm.id);
    setModalVisible(true);
    
    // Haritayı alarm konumuna odakla
    mapRef.current.animateToRegion({
      latitude: alarm.latitude,
      longitude: alarm.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

  const deleteAlarm = (alarmId) => {
    // Aktif alarmlardan çıkar
    if (activeAlarms.includes(alarmId)) {
      setActiveAlarms(prev => prev.filter(id => id !== alarmId));
    }
    // Alarmlar listesinden çıkar
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

  const handleTimePickerShow = () => {
    if (Platform.OS === 'android') {
      setAndroidTimePickerMode(true);
    } else {
      // iOS için
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setAndroidTimePickerMode(false);
    } else {
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      setSelectedTime(selectedDate);
    }
  };

  const renderRightActions = (progress, dragX, alarm) => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={() => editAlarm(alarm)}
      >
        <Ionicons name="create-outline" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => 
          Alert.alert(
            'Onay', 
            `${alarm.name} alarmını silmek istediğinizden emin misiniz?`,
            [
              {text: 'İptal', style: 'cancel'},
              {text: 'Sil', style: 'destructive', onPress: () => deleteAlarm(alarm.id)}
            ]
          )
        }
      >
        <Ionicons name="trash-outline" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderAlarmItem = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => 
        renderRightActions(progress, dragX, item)
      }
    >
      <TouchableOpacity 
        style={[
          styles.alarmItem, 
          activeAlarms.includes(item.id) && styles.activeAlarm
        ]}
        onPress={() => {
          // Alarm konumuna odaklan
          mapRef.current.animateToRegion({
            latitude: item.latitude,
            longitude: item.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }}
      >
        <Text style={styles.alarmTitle}>{item.name}</Text>
        <View style={styles.alarmInfoContainer}>
          <View style={styles.alarmTypeContainer}>
            <Ionicons 
              name={item.timeEnabled ? "time-outline" : "location-outline"} 
              size={16} 
              color="#666" 
            />
            <Text style={styles.alarmDetails}>
              {item.timeEnabled ? 
                new Date(item.time).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Konum alarmı'
              }
            </Text>
          </View>
          <View style={styles.alarmTypeContainer}>
            <Ionicons name="navigate-outline" size={16} color="#666" />
            <Text style={styles.alarmDetails}>
              {item.radius || 100}m yarıçap
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  // Alarmları temizleme fonksiyonu (geliştirici için)
  const clearAllAlarms = async () => {
    try {
      await AsyncStorage.removeItem(ALARMS_STORAGE_KEY);
      setAlarms([]);
      Alert.alert('Başarılı', 'Tüm alarmlar silindi.');
    } catch (error) {
      console.error('Alarmlar silinirken hata oluştu:', error);
      Alert.alert('Hata', 'Alarmlar silinemedi.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Konum bilgisi alınıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {initialRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {alarms.map(alarm => (
            <React.Fragment key={alarm.id}>
              <Marker 
                coordinate={{
                  latitude: alarm.latitude,
                  longitude: alarm.longitude
                }}
                title={alarm.name}
                pinColor={activeAlarms.includes(alarm.id) ? "red" : "orange"}
              />
              <Circle 
                center={{
                  latitude: alarm.latitude,
                  longitude: alarm.longitude
                }}
                radius={alarm.radius || 100}
                strokeWidth={1}
                strokeColor="rgba(0, 122, 255, 0.5)"
                fillColor="rgba(0, 122, 255, 0.1)"
              />
            </React.Fragment>
          ))}
          
          {modalVisible && selectedLocation && (
            <>
              <Marker coordinate={selectedLocation} pinColor="green" />
              <Circle 
                center={selectedLocation}
                radius={proximityRadius}
                strokeWidth={1}
                strokeColor="rgba(50, 205, 50, 0.5)"
                fillColor="rgba(50, 205, 50, 0.1)"
              />
            </>
          )}
        </MapView>
      )}

      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={centerToUserLocation}
        >
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Alarmlarım</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedLocation(currentLocation);
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {alarms.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="alarm-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>Henüz alarm eklenmedi</Text>
            <Text style={styles.emptyStateSubText}>
              Yeni bir konum alarmı eklemek için sağ üstteki + butonuna basın
            </Text>
          </View>
        ) : (
          <FlatList
            data={alarms}
            keyExtractor={(item) => item.id}
            renderItem={renderAlarmItem}
            style={styles.alarmList}
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetModalState();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editMode ? 'Alarmı Düzenle' : 'Yeni Alarm'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Alarm Adı</Text>
              <TextInput
                style={styles.input}
                value={alarmTitle}
                onChangeText={setAlarmTitle}
                placeholder="Alarm adını girin"
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.inputLabel}>Zamanlı Alarm</Text>
              <Switch
                value={isTimeEnabled}
                onValueChange={setIsTimeEnabled}
              />
            </View>

            {isTimeEnabled && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Alarm Saati</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={handleTimePickerShow}
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Yakınlık Mesafesi</Text>
              <View style={styles.radiusOptions}>
                {[50, 100, 200, 500].map(radius => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusOption,
                      proximityRadius === radius && styles.selectedRadiusOption
                    ]}
                    onPress={() => setProximityRadius(radius)}
                  >
                    <Text style={[
                      styles.radiusOptionText,
                      proximityRadius === radius && styles.selectedRadiusOptionText
                    ]}>
                      {radius}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.locationNote}>
              <Ionicons name="information-circle-outline" size={18} color="#666" />
              <Text style={styles.locationNoteText}>
                Konumu değiştirmek için haritada istediğiniz noktaya dokunun
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveAlarm}
              >
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => resetModalState()}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  İptal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* iOS için saat seçici */}
      {Platform.OS === 'ios' && showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleTimeChange}
        />
      )}

      {/* Android için saat seçici */}
      {Platform.OS === 'android' && androidTimePickerMode && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="default" 
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 50,
  },
  controlButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 10,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginTop: 10,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },
  alarmList: {
    marginTop: 10,
  },
  alarmItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  activeAlarm: {
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  alarmTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  alarmInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alarmTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmDetails: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: '90%',
    marginVertical: 5,
    marginRight: 5,
    borderRadius: 10,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
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
    fontSize: 22,
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
  radiusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusOption: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedRadiusOption: {
    backgroundColor: '#007AFF',
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedRadiusOptionText: {
    color: 'white',
  },
  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 20,
  },
  locationNoteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
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