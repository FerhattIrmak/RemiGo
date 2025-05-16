import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import Constants from "expo-constants";

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
};

// Firebase başlat
const firebaseApp = initializeApp(firebaseConfig);

// Firebase Analytics başlat (sadece web ve native build'lerde çalışır)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(firebaseApp);
}

export { firebaseApp, analytics, logEvent };
