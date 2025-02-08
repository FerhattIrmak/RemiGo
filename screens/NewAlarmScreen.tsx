import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  ScrollView,
  Modal,
  Platform,
  Dimensions,
  Pressable
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const WheelPicker = ({ data, selectedIndex, onChange }) => {
  return (
    <ScrollView
      style={styles.wheelPicker}
      showsVerticalScrollIndicator={false}
      snapToInterval={50}
      decelerationRate="fast"
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.y / 50);
        onChange(data[index]);
      }}
    >
      {data.map((item, index) => (
        <Pressable
          key={item}
          style={[
            styles.wheelItem,
            selectedIndex === index && styles.selectedWheelItem
          ]}
          onPress={() => onChange(item)}
        >
          <Text style={[
            styles.wheelItemText,
            selectedIndex === index && styles.selectedWheelItemText
          ]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const NewAlarmScreen = () => {
  const [alarmTime, setAlarmTime] = useState({ hours: '12', minutes: '00' });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState('');
  const [alarmDescription, setAlarmDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
  });

  const mapRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Picker için saat ve dakika seçenekleri oluştur
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleLocationSelect = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const searchLocations = async (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Arama hatası:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (item) => {
    const newLocation = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
    setSelectedLocation(newLocation);
    setSearchResults([]);
    setSearchQuery(item.display_name);
    mapRef.current?.animateToRegion({
      ...newLocation,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const formatTime = () => {
    return `${alarmTime.hours}:${alarmTime.minutes}`;
  };

  const TimePickerModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showTimePicker}
      onRequestClose={() => setShowTimePicker(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity 
              onPress={() => setShowTimePicker(false)}
              style={styles.pickerHeaderButton}
            >
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowTimePicker(false)}
              style={styles.pickerHeaderButton}
            >
              <Text style={styles.doneText}>Tamam</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWrapper}>
            <WheelPicker
              data={hours}
              selectedIndex={parseInt(alarmTime.hours)}
              onChange={(value) => setAlarmTime(prev => ({ ...prev, hours: value }))}
            />
            <Text style={styles.pickerSeparator}>:</Text>
            <WheelPicker
              data={minutes}
              selectedIndex={parseInt(alarmTime.minutes)}
              onChange={(value) => setAlarmTime(prev => ({ ...prev, minutes: value }))}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Konum Ara..."
          value={searchQuery}
          onChangeText={searchLocations}
        />
        {searchResults.length > 0 && (
          <FlatList
            style={styles.searchResults}
            data={searchResults}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectSearchResult(item)}
              >
                <Text numberOfLines={2}>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleLocationSelect}
        >
          <Marker coordinate={selectedLocation} />
        </MapView>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Alarm Başlığı</Text>
          <TextInput
            style={styles.input}
            placeholder="Alarm Başlığı Girin"
            value={alarmTitle}
            onChangeText={setAlarmTitle}
          />

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Alarm için açıklama girin"
            value={alarmDescription}
            onChangeText={setAlarmDescription}
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Alarm Saati</Text>
          <TouchableOpacity 
            style={styles.timePickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeIcon}>🕒</Text>
            <Text style={styles.timePickerButtonText}>{formatTime()}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Seçilen Konum</Text>
          <Text style={styles.locationText}>
            {`Lat: ${selectedLocation.latitude.toFixed(4)}, Lng: ${selectedLocation.longitude.toFixed(4)}`}
          </Text>

          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TimePickerModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 10,
    paddingTop: 70,
    
  },
  searchContainer: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  map: {
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: '#f7f7f7',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  timePickerButtonText: {
    flex: 1,
    fontSize: 18,
    color: '#333',
  },
  timeIcon: {
    fontSize: 22,
    color: '#6200EE',
    marginRight: 10,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerHeaderButton: {
    padding: 10,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  doneText: {
    color: '#6200EE',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  wheelPicker: {
    width: 80,
    height: 200,
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedWheelItem: {
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
  },
  wheelItemText: {
    fontSize: 20,
    color: '#666',
  },
  selectedWheelItemText: {
    color: '#6200EE',
    fontWeight: '600',
  },
  pickerSeparator: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 10,
  },
});

export default NewAlarmScreen;