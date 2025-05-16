import 'expo-dev-client'; // veya projenizin girişine göre gerekli importlar
import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App'; // Ana App componentinizin yolu farklıysa güncelleyin

// --- YENİ KOD BAŞLANGICI ---
const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_STORAGE_KEY = 'background-location-data';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Background Location Task] Error:', error);
    // Burada hatayı loglama veya analiz servisine gönderme yapabilirsiniz.
    return;
  }
  if (data) {
    // Expo Location type definitionını kullanmak daha güvenli olabilir
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      console.log('[Background Location Task] Received locations:', locations.length);

      try {
        const storedLocationsString = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        const storedLocations: Location.LocationObjectCoords[] = storedLocationsString ? JSON.parse(storedLocationsString) : [];

        // Sadece koordinatları ve timestamp'i saklayalım (isteğe bağlı)
        const newLocationCoords = locations.map(loc => ({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy, // Doğruluğu da saklamak faydalı olabilir
          altitude: loc.coords.altitude,
          heading: loc.coords.heading,
          speed: loc.coords.speed,
          altitudeAccuracy: loc.coords.altitudeAccuracy, // Yeni typelarda null olabilir, kontrol ekleyin
          timestamp: loc.timestamp, // Timestamp'i de saklayalım
        }));

        const updatedLocations = [...storedLocations, ...newLocationCoords];

        // Belirli bir sayıdan fazla konumu saklamamak için eski verileri sil (isteğe bağlı)
        const MAX_LOCATIONS = 500; // Örneğin son 500 konumu sakla
        const trimmedLocations = updatedLocations.slice(-MAX_LOCATIONS);


        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(trimmedLocations));
        // console.log(`[Background Location Task] ${trimmedLocations.length} locations saved to AsyncStorage.`);

      } catch (storageError) {
        console.error('[Background Location Task] AsyncStorage Error:', storageError);
      }
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);