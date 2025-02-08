import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Button, Card, Modal, Portal, Provider } from 'react-native-paper'; // Modal bileşeni
import { MaterialIcons } from '@expo/vector-icons'; // İkonlar için

const HomeScreen = ({ navigation }: any) => {
  const [visible, setVisible] = useState(false); // Modal görünürlüğü
  const [alarmTime, setAlarmTime] = useState(''); // Alarm saati
  const [alarmLocation, setAlarmLocation] = useState(''); // Alarm konumu

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  const saveNewAlarm = () => {
    console.log('Yeni alarm kaydedildi:', { alarmTime, alarmLocation });
    hideModal(); // Modalı kapatma
  };

  return (
    <Provider>
      <View style={styles.container}>
        {/* Ayarlar butonu */}
        <Button
          icon="settings"
          onPress={() => navigation.navigate('Settings')} // Ayarlar sayfasına yönlendirir
          style={styles.settingsButton}
        >
          Ayarlar
        </Button>

        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Title 
              title="Aktif Alarm Durumu" 
              subtitle="Konum tabanlı alarm aktif" 
              left={(props) => <MaterialIcons name="alarm" size={24} color="black" {...props} />}
            />
            <Card.Content>
              <Text style={styles.alarmText}>Alarmınız şu anda aktif. Konumunuza göre alarm çalacak.</Text>
            </Card.Content>
          </Card>

          <Button 
            icon="plus" 
            mode="contained" 
            onPress={showModal} // Modal açılacak
            style={styles.button}
              onPress={() => navigation.navigate('NewAlarm')} // NewAlarm ekranına yönlendirme
          style={styles.button}
          >
            Yeni Alarm Ekle
          </Button>

          {/* Yeni Alarm Modal */}
          <Portal>
            <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modal}>
              <Text style={styles.modalTitle}>Yeni Alarm Ekle</Text>
              <TextInput
                style={styles.input}
                placeholder="Alarm Saati (HH:MM)"
                value={alarmTime}
                onChangeText={setAlarmTime}
              />
              <TextInput
                style={styles.input}
                placeholder="Alarm Konumu"
                value={alarmLocation}
                onChangeText={setAlarmLocation}
              />

              <Button 
                mode="contained" 
                onPress={saveNewAlarm} 
                style={styles.modalButton}
              >
                Kaydet
              </Button>
              <Button 
                mode="outlined" 
                onPress={hideModal} 
                style={styles.modalButton}
              >
                Kapat
              </Button>
            </Modal>
          </Portal>
        </View>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Soft background color
    padding: 20,
  },
  settingsButton: {
    alignSelf: 'flex-end', // Sağ üstte yerleştirilen buton
    marginBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 10, // Köşe yuvarlama
    elevation: 5, // Gölgeleme efekti
  },
  alarmText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
  },
  button: {
    width: '80%',
    marginTop: 15,
    borderRadius: 10,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  modalButton: {
    marginTop: 10,
    width: '100%',
    borderRadius: 10,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});

export default HomeScreen;
