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
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALARMS_STORAGE_KEY = '@location_alarms';
const BACKGROUND_LOCATION_TASK = 'background-location-task';
const ALARM_SOUNDS = [
  { label: 'flex', value: 'flex.mp3' },
  { label: 'cosmic', value: 'cosmic.mp3' },
  { label: 'summer', value: 'summer.mp3' },
  { label: 'summertime', value: 'summertime.mp3' },
  { label: 'ringtone', value: 'ringtone.mp3' },
  { label: 'attack', value: 'attack.mp3' },
  { label: 'biohazard', value: 'biohazard.mp3' },
];

// Bildirim ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Arka planda konum izleme görevi
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const coords = locations[0].coords;
    const alarms = JSON.parse(await AsyncStorage.getItem(ALARMS_STORAGE_KEY)) || [];

    for (const alarm of alarms) {
      if (!alarm.active) continue;
      const distance = getDistance(coords.latitude, coords.longitude, alarm.latitude, alarm.longitude);
      if (distance < alarm.radius) {
        const now = new Date();
        if (!alarm.timeBased || Math.abs(now - new Date(alarm.time)) < 60000) {
          await triggerAlarm(alarm, false);
          break;
        }
      }
    }
  }
});

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const triggerAlarm = async (alarm, showAlert = true) => {
  const soundFiles = {
    'flex.mp3': require('../assets/flex.mp3'),
    'biohazard.mp3': require('../assets/biohazard.mp3'),
    'ringtone.mp3': require('../assets/ringtone.mp3'),
    'attack.mp3': require('../assets/attack.mp3'),
    'summertime.mp3': require('../assets/summertime.mp3'),
    'cosmic.mp3': require('../assets/cosmic.mp3'),
    'summer.mp3': require('../assets/summer.mp3'),
  };

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  let soundObject;
  try {
    const { sound } = await Audio.Sound.createAsync(soundFiles[alarm.sound], { shouldPlay: true });
    soundObject = sound;
    await sound.playAsync();
  } catch (error) {
    console.error('Error playing alarm sound:', error);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Alarm Triggered!',
      body: `${alarm.name} - You’ve entered the location!`,
      sound: 'default',
    },
    trigger: null,
  });

  const deactivateAlarm = async () => {
    const alarms = JSON.parse(await AsyncStorage.getItem(ALARMS_STORAGE_KEY)) || [];
    const updatedAlarms = alarms.map(a => a.id === alarm.id ? { ...a, active: false } : a);
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedAlarms));
    return updatedAlarms;
  };

  const updatedAlarms = await deactivateAlarm();
  
  if (showAlert) {
    Alert.alert(
      'Alarm Triggered!',
      `${alarm.name}\n\nThis alarm has been triggered and deactivated!`,
      [{
        text: 'Tamam',
        onPress: async () => {
          if (soundObject) {
            await soundObject.stopAsync();
            await soundObject.unloadAsync();
          }
          const setAlarms = global.setAlarmsFunction;
          if (setAlarms) setAlarms(updatedAlarms);
        },
      }],
      { cancelable: false }
    );
  } else if (soundObject) {
    setTimeout(async () => {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
    }, 30000);
  }

  return updatedAlarms;
};

const LocationAlarm = ({ navigation, route }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [alarms, setAlarms] = useState(route.params?.alarms || []);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isTimeBased, setIsTimeBased] = useState(false);
  const [initialRegion, setInitialRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(100);
  const [editAlarm, setEditAlarm] = useState(null);
  const [selectedSound, setSelectedSound] = useState('flex.mp3');
  const [playingSound, setPlayingSound] = useState(null);
  const mapRef = useRef(null);
  const modalOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    global.setAlarmsFunction = setAlarms;
    return () => {
      global.setAlarmsFunction = null;
    };
  }, [setAlarms]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      if (Platform.OS === 'ios') {
        Animated.timing(modalOffset, {
          toValue: -e.endCoordinates.height / 2,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS === 'ios') {
        Animated.timing(modalOffset, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [modalOffset]);

  useEffect(() => {
    const loadAlarms = async () => {
      try {
        const savedAlarms = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
        if (savedAlarms) {
          const parsedAlarms = JSON.parse(savedAlarms);
          setAlarms(parsedAlarms);
          navigation.setParams({ alarms: parsedAlarms });
        }
      } catch (error) {
        console.error('Error loading alarms:', error);
      }
    };
    loadAlarms();
  }, [navigation]);

  useEffect(() => {
    if (route.params?.alarms) {
      setAlarms(route.params.alarms);
    }
  }, [route.params?.alarms]);

  useEffect(() => {
    if (alarms.length >= 0) {
      AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
      navigation.setParams({ alarms });
    }
  }, [alarms, navigation]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const foregroundStatus = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus.status !== 'granted') {
        Alert.alert('Permission Denied', 'Foreground location access is required.');
        setLoading(false);
        return;
      }

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        Alert.alert('Permission Denied', 'Background location access is required.');
        setLoading(false);
        return;
      }

      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Notification access is required.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(location.coords);
      setInitialRegion({ ...location.coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });

      const foregroundSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (newLocation) => {
          setCurrentLocation(newLocation.coords);
          checkProximity(newLocation.coords);
        }
      );

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'RemiGo Running',
          notificationBody: 'Tracking your location for alarms.',
        },
        showsBackgroundLocationIndicator: true,
      });

      setLoading(false);

      return () => {
        foregroundSubscription.remove();
        Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      };
    })();
  }, []);

  const checkProximity = async (coords) => {
    const now = new Date();
    for (const alarm of alarms) {
      if (!alarm.active) continue;
      const distance = getDistance(coords.latitude, coords.longitude, alarm.latitude, alarm.longitude);
      if (distance < alarm.radius) {
        if (!alarm.timeBased || Math.abs(now - new Date(alarm.time)) < 60000) {
          const updatedAlarms = await triggerAlarm(alarm, true);
          setAlarms(updatedAlarms);
          navigation.setParams({ alarms: updatedAlarms });
          break;
        }
      }
    }
  };

  const playSoundPreview = async (soundValue) => {
    if (playingSound) {
      await playingSound.stopAsync();
      await playingSound.unloadAsync();
    }

    const soundFiles = {
      'flex.mp3': require('../assets/flex.mp3'),
      'biohazard.mp3': require('../assets/biohazard.mp3'),
      'ringtone.mp3': require('../assets/ringtone.mp3'),
      'attack.mp3': require('../assets/attack.mp3'),
      'summertime.mp3': require('../assets/summertime.mp3'),
      'cosmic.mp3': require('../assets/cosmic.mp3'),
      'summer.mp3': require('../assets/summer.mp3'),
    };

    try {
      const { sound } = await Audio.Sound.createAsync(soundFiles[soundValue]);
      setPlayingSound(sound);
      await sound.playAsync();
      setTimeout(async () => {
        await sound.stopAsync();
        await sound.unloadAsync();
        setPlayingSound(null);
      }, 5000);
    } catch (error) {
      console.error('Error playing sound preview:', error);
      Alert.alert('Error', 'Could not play sound preview.');
    }
  };

  const stopSoundPreview = async () => {
    if (playingSound) {
      try {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
      } catch (error) {
        console.error('Error stopping sound preview:', error);
      } finally {
        setPlayingSound(null);
      }
    }
  };

  const saveAlarm = async () => {
    if (!alarmTitle) {
      Alert.alert('Error', 'Please enter an alarm name');
      return;
    }
    if (!selectedLocation && !currentLocation) {
      Alert.alert('Error', 'Please select a location');
      return;
    }

    const newAlarm = {
      id: editAlarm?.id || Date.now().toString(),
      name: alarmTitle,
      time: selectedTime.toISOString(),
      timeBased: isTimeBased,
      latitude: selectedLocation?.latitude || currentLocation.latitude,
      longitude: selectedLocation?.longitude || currentLocation.longitude,
      radius,
      sound: selectedSound,
      active: true,
    };

    const updatedAlarms = editAlarm
      ? alarms.map(a => a.id === editAlarm.id ? newAlarm : a)
      : [...alarms, newAlarm];
    
    setAlarms(updatedAlarms);
    navigation.setParams({ alarms: updatedAlarms });
    await stopSoundPreview();
    await resetModal();
  };

  const resetModal = async () => {
    await stopSoundPreview();
    setModalVisible(false);
    setAlarmTitle('');
    setSelectedTime(new Date());
    setTempTime(new Date());
    setIsTimeBased(false);
    setRadius(100);
    setSelectedSound('flex.mp3');
    setEditAlarm(null);
    setSelectedLocation(null);
    Keyboard.dismiss();
  };

  const deleteAlarm = async (id) => {
    const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedAlarms));
    navigation.setParams({ alarms: updatedAlarms });
  };

  const toggleAlarmActive = async (id) => {
    const updatedAlarms = alarms.map(alarm =>
      alarm.id === id ? { ...alarm, active: !alarm.active } : alarm
    );
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedAlarms));
    navigation.setParams({ alarms: updatedAlarms });
  };

  const centerMap = () => {
    if (currentLocation) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleMapPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    setSelectedLocation(coords);
    setModalVisible(true);
  };

  const handleTimeChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (date) setSelectedTime(date);
    } else if (date) {
      setTempTime(date);
    }
  };

  const confirmTime = () => {
    setSelectedTime(tempTime);
    setShowTimePicker(false);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAlarmItem = ({ item }) => (
    <Swipeable renderRightActions={() => (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setEditAlarm(item);
            setAlarmTitle(item.name);
            setSelectedTime(new Date(item.time));
            setTempTime(new Date(item.time));
            setIsTimeBased(item.timeBased);
            setRadius(item.radius);
            setSelectedSound(item.sound);
            setSelectedLocation({ latitude: item.latitude, longitude: item.longitude });
            setModalVisible(true);
          }}
        >
          <Ionicons name="pencil" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => Alert.alert('Confirm', 'Delete this alarm?', [
            { text: 'Cancel' },
            { text: 'Delete', onPress: () => deleteAlarm(item.id) },
          ])}
        >
          <Ionicons name="trash" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    )}>
      <View style={[styles.alarmItem, !item.active && styles.inactiveAlarm]}>
        <TouchableOpacity
          style={styles.alarmContent}
          onPress={() => mapRef.current.animateToRegion({
            latitude: item.latitude,
            longitude: item.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000)}
        >
          <View style={styles.alarmTextContainer}>
            <Text style={[styles.alarmName, !item.active && styles.inactiveText]}>{item.name}</Text>
            <View style={styles.alarmDetails}>
              <Ionicons
                name={item.timeBased ? "time-outline" : "location-outline"}
                size={16}
                color={item.active ? "#64748b" : "#94a3b8"}
              />
              <Text style={[styles.alarmDetail, !item.active && styles.inactiveText]}>
                {item.timeBased
                  ? formatTime(new Date(item.time))
                  : `${item.radius}m radius`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <Switch
          value={item.active}
          onValueChange={() => toggleAlarmActive(item.id)}
          trackColor={{ false: '#e2e8f0', true: '#60a5fa' }}
          thumbColor={item.active ? '#FFF' : '#FFF'}
          style={{ transform: [{ scale: 1.5 }] }} // Switch boyutu büyütüldü
        />
      </View>
    </Swipeable>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        onPress={handleMapPress}
        showsMyLocationButton={false}
      >
        {alarms.map(alarm => (
          <React.Fragment key={alarm.id}>
            <Marker
              coordinate={{ latitude: alarm.latitude, longitude: alarm.longitude }}
              title={alarm.name}
              pinColor={alarm.active ? "#2563eb" : "#94a3b8"}
            />
            <Circle
              center={{ latitude: alarm.latitude, longitude: alarm.longitude }}
              radius={alarm.radius}
              strokeColor={alarm.active ? "rgba(96, 165, 250, 0.6)" : "rgba(148, 163, 184, 0.6)"}
              fillColor={alarm.active ? "rgba(96, 165, 250, 0.2)" : "rgba(148, 163, 184, 0.2)"}
            />
          </React.Fragment>
        ))}
        {selectedLocation && (
          <>
            <Marker
              coordinate={selectedLocation}
              pinColor="#60a5fa"
              draggable
              onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
            />
            <Circle
              center={selectedLocation}
              radius={radius}
              strokeColor="rgba(96, 165, 250, 0.6)"
              fillColor="rgba(96, 165, 250, 0.2)"
            />
          </>
        )}
      </MapView>

      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={centerMap}>
          <Ionicons name="locate" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => {
            setSelectedLocation(null);
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.alarmContainer}>
        <Text style={styles.headerText}>My Alarms</Text>
        <FlatList
          data={alarms}
          renderItem={renderAlarmItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="alarm-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No alarms yet</Text>
              <Text style={styles.emptySubText}>Tap anywhere on the map or use + to add an alarm</Text>
            </View>
          )}
          contentContainerStyle={styles.alarmListContent}
        />
      </View>

      <Modal visible={modalVisible} animationType="none" transparent>
        <View style={styles.modalContainer}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: modalOffset }] },
            ]}
          >
            <Text style={styles.modalTitle}>
              {editAlarm ? 'Edit Alarm' : 'New Alarm'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={alarmTitle}
                onChangeText={setAlarmTitle}
                placeholder="Enter alarm name"
                placeholderTextColor="#64748b"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Time-based</Text>
                <Switch
                  value={isTimeBased}
                  onValueChange={setIsTimeBased}
                  trackColor={{ false: '#e2e8f0', true: '#60a5fa' }}
                  thumbColor={isTimeBased ? '#FFF' : '#FFF'}
                />
              </View>
              {isTimeBased && (
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.timeText}>
                    {formatTime(selectedTime)}
                  </Text>
                </TouchableOpacity>
              )}
              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    textColor="#1e3a8a"
                    accentColor="#60a5fa"
                    style={styles.timePicker}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.timePickerButtons}>
                      <TouchableOpacity
                        style={styles.timePickerBtn}
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={styles.timePickerBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timePickerBtn, styles.timePickerConfirmBtn]}
                        onPress={confirmTime}
                      >
                        <Text style={styles.timePickerBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius</Text>
              <View style={styles.radiusOptions}>
                {[50, 100, 200, 500].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                    onPress={() => setRadius(r)}
                  >
                    <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>
                      {r}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alarm Sound</Text>
              <View style={styles.soundOptionsContainer}>
                <FlatList
                  data={ALARM_SOUNDS}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.soundOption,
                        selectedSound === item.value && styles.soundOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedSound(item.value);
                        playSoundPreview(item.value);
                      }}
                    >
                      <Text style={[
                        styles.soundOptionText,
                        selectedSound === item.value && styles.soundOptionTextSelected,
                      ]}>
                        {item.label}
                      </Text>
                      {selectedSound === item.value && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.value}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveAlarm}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  map: { flex: 1 },
  mapControls: { position: 'absolute', top: 50, right: 10, gap: 12 },
  controlBtn: { backgroundColor: '#60a5fa', padding: 12, borderRadius: 30, elevation: 4, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  alarmContainer: { flex: 1, backgroundColor: '#f0f9ff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, elevation: 8 },
  headerText: { fontSize: 24, fontWeight: '800', color: '#1e3a8a', marginBottom: 12 },
  alarmListContent: { paddingBottom: 16 },
  alarmItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginVertical: 4, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(147,197,253,0.3)', elevation: 2 },
  inactiveAlarm: { backgroundColor: '#f1f5f9', borderColor: 'rgba(148, 163, 184, 0.3)' },
  alarmContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  alarmTextContainer: { flex: 1 },
  alarmName: { fontSize: 16, fontWeight: '700', color: '#1e3a8a' },
  inactiveText: { color: '#94a3b8' },
  alarmDetails: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  alarmDetail: { fontSize: 12, color: '#2563eb', marginLeft: 4, fontStyle: 'italic' },
  swipeActions: { flexDirection: 'row', marginVertical: 4 },
  editBtn: { backgroundColor: '#2563eb', padding: 16, justifyContent: 'center' },
  deleteBtn: { backgroundColor: '#ef4444', padding: 16, justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1e3a8a', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(30, 58, 138, 0.5)' },
  modalContent: { backgroundColor: '#f0f9ff', marginHorizontal: 24, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(147,197,253,0.5)', elevation: 4 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a', marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 16, color: '#2563eb', marginBottom: 8, fontWeight: '600', fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#93c5fd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', color: '#1e3a8a' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeBtn: { padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, marginTop: 8, width: '100%', alignItems: 'center' },
  timeText: { fontSize: 16, color: '#1e3a8a', fontWeight: '500' },
  timePickerContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 10, width: '100%' },
  timePicker: { backgroundColor: '#f0f9ff', width: 200 },
  timePickerButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  timePickerBtn: { backgroundColor: '#ef4444', padding: 10, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  timePickerConfirmBtn: { backgroundColor: '#60a5fa' },
  timePickerBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  radiusOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  radiusBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 20 },
  radiusBtnActive: { backgroundColor: '#60a5fa' },
  radiusText: { fontSize: 14, color: '#1e3a8a' },
  radiusTextActive: { color: '#fff', fontWeight: '500' },
  soundOptionsContainer: { marginTop: 8, maxHeight: 50 },
  soundOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#93c5fd' },
  soundOptionSelected: { backgroundColor: '#60a5fa', borderColor: '#60a5fa' },
  soundOptionText: { color: '#1e3a8a', fontSize: 14 },
  soundOptionTextSelected: { color: '#fff', fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  saveBtn: { backgroundColor: '#60a5fa', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
});

export default LocationAlarm;