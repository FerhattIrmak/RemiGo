import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  Easing,
  Platform,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
} from 'react-native';
import { Modal, Portal, Provider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const ALARMS_STORAGE_KEY = '@location_alarms';

const HomeScreen = ({ navigation, route }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmLocation, setAlarmLocation] = useState('');
  const [alarms, setAlarms] = useState(route.params?.alarms || []);
  const glowAnim = new Animated.Value(0);

  useEffect(() => {
    const loadAlarms = async () => {
      try {
        const savedAlarms = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
        if (savedAlarms !== null) {
          setAlarms(JSON.parse(savedAlarms));
        }
      } catch (error) {
        console.error('Error loading alarms:', error);
      }
    };
    loadAlarms();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route.params?.alarms) {
        setAlarms(route.params.alarms);
      }
    });
    return unsubscribe;
  }, [navigation, route.params?.alarms]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const showModal = () => setModalVisible(true);
  const hideModal = () => setModalVisible(false);

  const saveNewAlarm = async () => {
    const newAlarm = {
      id: Math.random().toString(),
      name: alarmLocation || 'Timeless',
      time: alarmTime ? new Date(`1970-01-01T${alarmTime}:00`).toISOString() : new Date().toISOString(),
      timeEnabled: !!alarmTime,
      latitude: 0,
      longitude: 0,
      radius: 100,
      active: true,
    };
    const updatedAlarms = [...alarms, newAlarm];
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedAlarms));
    navigation.setParams({ alarms: updatedAlarms });
    setAlarmTime('');
    setAlarmLocation('');
    hideModal();
  };

  const toggleAlarmActive = async (id) => {
    const updatedAlarms = alarms.map((alarm) =>
      alarm.id === id ? { ...alarm, active: !alarm.active } : alarm
    );
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedAlarms));
    navigation.setParams({ alarms: updatedAlarms });
  };

  const deleteAlarm = async (id) => {
    const updatedAlarms = alarms.filter((alarm) => alarm.id !== id);
    setAlarms(updatedAlarms);
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedAlarms));
    navigation.setParams({ alarms: updatedAlarms });
  };

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const renderAlarmItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={1000} delay={index * 200} style={styles.alarmItemContainer}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('NewAlarm', { alarmToEdit: item, alarms })}
      >
        <LinearGradient
          colors={item.active ? ['#93c5fd', '#60a5fa'] : ['#e2e8f0', '#cbd5e1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.alarmGradient}
        >
          <View style={styles.alarmContent}>
            <View style={styles.alarmIconOrb}>
              <MaterialCommunityIcons
                name={item.timeEnabled ? 'clock-outline' : 'map-marker-outline'}
                size={24}
                color={item.active ? '#1e3a8a' : '#64748b'}
              />
            </View>
            <View style={styles.alarmDetails}>
              <Text style={styles.alarmName}>{item.name}</Text>
              <Text style={styles.alarmInfo}>
                {item.timeEnabled
                  ? new Date(item.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                  : `${item.radius}m radius`}
              </Text>
            </View>
            <View style={styles.alarmActions}>
              <TouchableOpacity onPress={() => toggleAlarmActive(item.id)} style={styles.actionButton}>
                <Feather
                  name={item.active ? 'bell' : 'bell-off'}
                  size={20}
                  color={item.active ? '#1e3a8a' : '#94a3b8'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteAlarm(item.id)} style={styles.deleteButton}>
                <Feather name="trash-2" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <Provider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f0f9ff" />
        <LinearGradient
          colors={['#f0f9ff', '#bfdbfe', '#93c5fd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <Animatable.View animation="fadeInDown" duration={1200} style={styles.header}>
            <View style={styles.headerContainer}>
              <View style={styles.headerGlow}>
                <Text style={styles.headerTitle}>RemiGo</Text>
                <Text style={styles.headerSubtitle}>A Timeless Flow</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
                <Ionicons name="settings-outline" size={22} color="#1e3a8a" />
              </TouchableOpacity>
            </View>
          </Animatable.View>

          <View style={styles.content}>
            <View style={styles.alarmListContainer}>
              <Text style={styles.listTitle}>Your Moments</Text>
              {alarms.length === 0 ? (
                <Animatable.View animation="zoomIn" duration={1000} style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="weather-cloudy-clock" size={60} color="#60a5fa" />
                  <Text style={styles.emptyStateText}>Nothing Yet</Text>
                  <Text style={styles.emptyStateSubText}>Add a moment to begin</Text>
                </Animatable.View>
              ) : (
                <FlatList
                  data={alarms}
                  renderItem={renderAlarmItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.alarmListContent}
                />
              )}
            </View>

            <Animated.View style={[styles.addButtonContainer, { transform: [{ scale: glowScale }] }]}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('NewAlarm', { alarms })}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#60a5fa', '#2563eb']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name="plus" size={28} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.addButtonLabel}>New Moment</Text>
            </Animated.View>
          </View>
        </LinearGradient>

        <Portal>
          <Modal visible={modalVisible} onDismiss={hideModal} contentContainerStyle={styles.modalContainer}>
            <BlurView intensity={15} tint="light" style={styles.modalBlur}>
              <LinearGradient
                colors={['#f0f9ff', '#dbeafe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalContent}
              >
                <Text style={styles.modalTitle}>Craft a Moment</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="time-outline" size={20} color="#2563eb" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="08:00"
                      value={alarmTime}
                      onChangeText={setAlarmTime}
                      keyboardType="numeric"
                      maxLength={5}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Place</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={20} color="#2563eb" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Skyline"
                      value={alarmLocation}
                      onChangeText={setAlarmLocation}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
                <TouchableOpacity onPress={saveNewAlarm} style={styles.saveButtonContainer}>
                  <LinearGradient
                    colors={['#93c5fd', '#60a5fa']}
                    style={styles.saveButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.saveButtonText}>Set</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={hideModal} style={styles.closeButton}>
                  <Feather name="x" size={22} color="#1e3a8a" />
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </Modal>
        </Portal>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerGlow: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.5)',
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  alarmListContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alarmListContent: {
    paddingBottom: 30,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -50,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
    marginTop: 15,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  alarmItemContainer: {
    marginBottom: 15,
  },
  alarmGradient: {
    padding: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.3)',
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  alarmContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmIconOrb: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  alarmDetails: {
    flex: 1,
  },
  alarmName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
    letterSpacing: 0.2,
  },
  alarmInfo: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  alarmActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  addButtonContainer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  addButton: {
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  addButtonLabel: {
    fontSize: 14,
    color: '#1e3a8a',
    marginTop: 10,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  modalContainer: {
    margin: 25,
    borderRadius: 40,
    overflow: 'hidden',
  },
  modalBlur: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 30,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.5)',
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 25,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 8,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e3a8a',
    fontWeight: '500',
  },
  saveButtonContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
});

export default HomeScreen;