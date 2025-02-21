import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export interface Timer {
  id: string;
  name: string;
  duration: number;
  category: string;
  createdAt: number;
}

const STORAGE_KEY = "@timers";

const TimerScreen = () => {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("");

  const saveTimer = async () => {
    try {
      if (!name || !duration || !category) {
        Alert.alert("Error", "Please fill all fields");
        return;
      }

      const newTimer: Timer = {
        id: Date.now().toString(),
        name,
        duration: parseInt(duration, 10),
        category,
        createdAt: Date.now(),
      };

      // Get existing timers
      const existingTimersJSON = await AsyncStorage.getItem(STORAGE_KEY);
      const existingTimers: Timer[] = existingTimersJSON
        ? JSON.parse(existingTimersJSON)
        : [];

      // Add new timer
      const updatedTimers = [...existingTimers, newTimer];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTimers));

      Alert.alert("Success", "Timer saved successfully!");
      router.back();
    } catch (error) {
      console.error("Error saving timer:", error);
      Alert.alert("Error", "Failed to save timer");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Timer Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter timer name"
        />

        <Text style={styles.label}>Duration (seconds)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="Enter duration in seconds"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Enter category"
        />

        <TouchableOpacity style={styles.button} onPress={saveTimer}>
          <Text style={styles.buttonText}>Save Timer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default TimerScreen;
