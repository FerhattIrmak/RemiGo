import { logEvent } from "expo-firebase-analytics";

export const trackEvent = async (eventName: string, params?: object) => {
  await logEvent(eventName, params);
};
