import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface HistoryEntry {
  id: string;
  timerName: string;
  category: string;
  duration: number;
  completedAt: number;
}

const HISTORY_STORAGE_KEY = "@timer_history";

const HistoryScreen = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const loadHistory = async () => {
    try {
      const historyJSON = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (historyJSON) {
        const historyData = JSON.parse(historyJSON);
        // Sort by completion time, most recent first
        setHistory(
          historyData.sort(
            (a: HistoryEntry, b: HistoryEntry) => b.completedAt - a.completedAt
          )
        );
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  useEffect(() => {
    const loadHistoryData = async () => {
      await loadHistory();
    };
    loadHistoryData();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const clearHistory = async () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all history?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.setItem(
                HISTORY_STORAGE_KEY,
                JSON.stringify([])
              );
              setHistory([]);
            } catch (error) {
              console.error("Error clearing history:", error);
            }
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: HistoryEntry }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.timerName}>{item.timerName}</Text>
        <Text style={styles.category}>{item.category}</Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.completedAt}>
          Completed: {formatDate(item.completedAt)}
        </Text>
        <Text style={styles.duration}>
          Duration: {formatDuration(item.duration)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Timer History</Text>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No completed timers yet</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  clearButton: {
    backgroundColor: "#F44336",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  list: {
    flex: 1,
    padding: 15,
  },
  historyItem: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  category: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completedAt: {
    fontSize: 14,
    color: "#666",
  },
  duration: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
});

export default HistoryScreen;
