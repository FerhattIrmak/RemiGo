import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card, Modal, Portal, Provider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

const HomeScreen = ({ navigation }: any) => {
  const [visible, setVisible] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmLocation, setAlarmLocation] = useState('');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  const saveNewAlarm = () => {
    console.log('Yeni alarm kaydedildi:', { alarmTime, alarmLocation });
    hideModal();
  };

  return (
    <Provider>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#d946ef']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animatable.View 
          animation="fadeInDown"
          duration={1000}
          style={styles.header}
        >
          <Button
            icon="settings"
            onPress={() => navigation.navigate('Settings')}
            textColor="#fff"
            style={styles.settingsButton}
          >
            Ayarlar
          </Button>
        </Animatable.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <Animatable.View 
            animation="fadeInUp"
            duration={1000}
            delay={300}
            style={styles.contentInner}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Card style={styles.card}>
                <Card.Title
                  title="Aktif Alarm Durumu"
                  titleStyle={styles.cardTitle}
                  subtitle="Konum tabanlı alarm aktif"
                  subtitleStyle={styles.cardSubtitle}
                  left={(props) => (
                    <MaterialIcons 
                      name="alarm" 
                      size={28} 
                      color="#6366f1" 
                      {...props} 
                    />
                  )}
                />
                <Card.Content>
                  <Text style={styles.alarmText}>
                    Alarmınız şu anda aktif. Konumunuza göre alarm çalacak.
                  </Text>
                </Card.Content>
              </Card>
            </Animated.View>

            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite"
              duration={1500}
            >
               <Button 
                icon="plus"
                mode="contained"
                onPress={() => navigation.navigate('NewAlarm')} 
                style={styles.button}
                labelStyle={styles.buttonLabel}
                contentStyle={styles.buttonContent}
              >
                Yeni Alarm Ekle
              </Button>
            </Animatable.View>

            <Portal>
              <Modal
                visible={visible}
                onDismiss={hideModal}
                contentContainerStyle={styles.modal}
              >
                <LinearGradient
                  colors={['#fff', '#f3f4f6']}
                  style={styles.modalGradient}
                >
                  <Text style={styles.modalTitle}>Yeni Alarm Ekle</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Alarm Saati (HH:MM)"
                    placeholderTextColor="#94a3b8"
                    value={alarmTime}
                    onChangeText={setAlarmTime}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Alarm Konumu"
                    placeholderTextColor="#94a3b8"
                    value={alarmLocation}
                    onChangeText={setAlarmLocation}
                  />

                  <View style={styles.modalButtons}>
                    <Button
                      mode="contained"
                      onPress={saveNewAlarm}
                      style={[styles.modalButton, styles.saveButton]}
                      labelStyle={styles.modalButtonLabel}
                    >
                      Kaydet
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={hideModal}
                      style={[styles.modalButton, styles.cancelButton]}
                      labelStyle={styles.modalButtonLabel}
                    >
                      Kapat
                    </Button>
                  </View>
                </LinearGradient>
              </Modal>
            </Portal>
          </Animatable.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    alignSelf: 'flex-end',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentInner: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  alarmText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 10,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonLabel: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    height: 48,
  },
  modal: {
    marginHorizontal: 30,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalButtons: {
    marginTop: 15,
  },
  modalButton: {
    borderRadius: 12,
    marginVertical: 8,
    paddingVertical: 6,
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  cancelButton: {
    borderColor: '#6366f1',
  },
  modalButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;