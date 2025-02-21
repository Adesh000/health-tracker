import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Timer } from "./create-tracker";
import { router, useFocusEffect } from "expo-router";
import ProgressBar from "./components/progressBar";

interface TimerWithStatus extends Timer {
  status: "Running" | "Paused" | "Completed";
  remainingTime: number;
}

interface GroupedTimers {
  [key: string]: TimerWithStatus[];
}

const STORAGE_KEY = "@timers";
const HISTORY_STORAGE_KEY = "@timer_history";

const HomeScreen = () => {
  const [groupedTimers, setGroupedTimers] = useState<GroupedTimers>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [activeTimers, setActiveTimers] = useState<{
    [key: string]: NodeJS.Timer;
  }>({});
  const [completedTimer, setCompletedTimer] = useState<TimerWithStatus | null>(
    null
  );

  const loadTimers = async () => {
    try {
      const timersJSON = await AsyncStorage.getItem(STORAGE_KEY);
      if (timersJSON) {
        const timers: Timer[] = JSON.parse(timersJSON);
        const timersWithStatus: TimerWithStatus[] = timers.map((timer) => ({
          ...timer,
          status: "Paused",
          remainingTime: timer.duration,
        }));

        // Group timers by category
        const grouped = timersWithStatus.reduce((acc, timer) => {
          if (!acc[timer.category]) {
            acc[timer.category] = [];
          }
          acc[timer.category].push(timer);
          return acc;
        }, {} as GroupedTimers);

        setGroupedTimers(grouped);
        // Initially expand all categories
        setExpandedCategories(Object.keys(grouped));
      }
    } catch (error) {
      console.error("Error loading timers:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Function to run when screen is focused
      loadTimers();

      // Optional cleanup (if needed)
      return () => {
        console.log("Screen unfocused");
      };
    }, [])
  );

  const persistTimers = async (groupedTimers: GroupedTimers) => {
    try {
      // Flatten groupedTimers into a single array
      const allTimers = Object.values(groupedTimers).flat();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allTimers));
    } catch (error) {
      console.error("Error persisting timers to AsyncStorage:", error);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((cat) => cat !== category)
        : [...prev, category]
    );
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const updateTimer = useCallback(
    (timerId: string, updates: Partial<TimerWithStatus>) => {
      setGroupedTimers((prevGrouped) => {
        const newGrouped = { ...prevGrouped };
        for (const category of Object.keys(newGrouped)) {
          const timerIndex = newGrouped[category].findIndex(
            (t) => t.id === timerId
          );
          if (timerIndex !== -1) {
            newGrouped[category][timerIndex] = {
              ...newGrouped[category][timerIndex],
              ...updates,
            };
            break;
          }
        }
        return newGrouped;
      });
    },
    []
  );

  const saveToHistory = async (timer: TimerWithStatus) => {
    try {
      const historyJSON = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const history: HistoryEntry[] = historyJSON
        ? JSON.parse(historyJSON)
        : [];

      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        timerName: timer.name,
        category: timer.category,
        duration: timer.duration,
        completedAt: Date.now(),
      };

      const updatedHistory = [historyEntry, ...history];
      await AsyncStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const startTimer = (timer: TimerWithStatus) => {
    if (timer.status === "Running" || timer.remainingTime === 0) return;

    const intervalId = setInterval(async () => {
      setGroupedTimers((prevGrouped) => {
        const newGrouped = { ...prevGrouped };
        for (const category of Object.keys(newGrouped)) {
          const timerIndex = newGrouped[category].findIndex(
            (t) => t.id === timer.id
          );
          if (timerIndex !== -1) {
            const updatedTimer = { ...newGrouped[category][timerIndex] };
            if (updatedTimer.remainingTime <= 1) {
              clearInterval(intervalId);
              setCompletedTimer(updatedTimer);
              saveToHistory(updatedTimer);
              updatedTimer.status = "Completed";
              updatedTimer.remainingTime = 0;

              // Remove the completed timer
              newGrouped[category].splice(timerIndex, 1);

              // Remove category if it becomes empty
              if (newGrouped[category].length === 0) {
                delete newGrouped[category];
              }

              // Update AsyncStorage
              persistTimers(newGrouped);

              break;
            } else {
              updatedTimer.remainingTime -= 1;
            }
            newGrouped[category][timerIndex] = updatedTimer;
          }
        }
        return newGrouped;
      });
    }, 1000);

    setActiveTimers((prev) => ({ ...prev, [timer.id]: intervalId }));
    updateTimer(timer.id, { status: "Running" });
  };

  const pauseTimer = (timer: TimerWithStatus) => {
    if (timer.status !== "Running") return;

    if (activeTimers[timer.id]) {
      clearInterval(activeTimers[timer.id]);
      const newActiveTimers = { ...activeTimers };
      delete newActiveTimers[timer.id];
      setActiveTimers(newActiveTimers);
    }

    updateTimer(timer.id, { status: "Paused" });
  };

  const resetTimer = (timer: TimerWithStatus) => {
    if (activeTimers[timer.id]) {
      clearInterval(activeTimers[timer.id]);
      const newActiveTimers = { ...activeTimers };
      delete newActiveTimers[timer.id];
      setActiveTimers(newActiveTimers);
    }

    updateTimer(timer.id, {
      status: "Paused",
      remainingTime: timer.duration,
    });
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(activeTimers).forEach((intervalId) =>
        clearInterval(intervalId)
      );
    };
  }, [activeTimers]);

  const startAllTimersInCategory = (category: string) => {
    const timers = groupedTimers[category];
    timers.forEach((timer) => {
      if (timer.status !== "Running" && timer.remainingTime > 0) {
        startTimer(timer);
      }
    });
  };

  const pauseAllTimersInCategory = (category: string) => {
    const timers = groupedTimers[category];
    timers.forEach((timer) => {
      if (timer.status === "Running") {
        pauseTimer(timer);
      }
    });
  };

  const resetAllTimersInCategory = (category: string) => {
    const timers = groupedTimers[category];
    timers.forEach((timer) => {
      resetTimer(timer);
    });
  };

  const renderTimer = (timer: TimerWithStatus) => {
    const progress = timer.remainingTime / timer.duration;

    return (
      <View style={styles.timerCard} key={timer.id}>
        <Text style={styles.timerName}>{timer.name}</Text>
        <View style={styles.timerDetails}>
          <Text style={styles.timerTime}>
            Time: {formatTime(timer.remainingTime)}
          </Text>
          <Text
            style={[
              styles.timerStatus,
              {
                color:
                  timer.status === "Running"
                    ? "#4CAF50"
                    : timer.status === "Paused"
                    ? "#FFC107"
                    : "#F44336",
              },
            ]}
          >
            {timer.status}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} />
          <Text style={styles.percentageText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        <View style={styles.controls}>
          {timer.status !== "Completed" && (
            <>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  {
                    backgroundColor:
                      timer.status === "Running" ? "#666" : "#4CAF50",
                  },
                ]}
                disabled={timer.status === "Running"}
                onPress={() => startTimer(timer)}
              >
                <Text style={styles.controlButtonText}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  {
                    backgroundColor:
                      timer.status === "Paused" ? "#666" : "#FFC107",
                  },
                ]}
                disabled={timer.status === "Paused"}
                onPress={() => pauseTimer(timer)}
              >
                <Text style={styles.controlButtonText}>Pause</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: "#F44336" }]}
            onPress={() => resetTimer(timer)}
          >
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Add the completion modal component
  const CompletionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={completedTimer !== null}
      onRequestClose={() => setCompletedTimer(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalMessage}>
              You've completed your timer:
            </Text>
            <Text style={styles.timerNameText}>{completedTimer?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setCompletedTimer(null)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Button
        title="Create Timer"
        onPress={() => router.push("/create-tracker")}
      />

      <ScrollView style={styles.list}>
        {Object.keys(groupedTimers).length === 0 ? (
          <Text style={styles.emptyText}>No timers created yet</Text>
        ) : (
          Object.entries(groupedTimers).map(([category, timers]) => (
            <View key={category} style={styles.categoryContainer}>
              <View style={styles.categoryHeader}>
                <TouchableOpacity
                  style={styles.categoryTitleContainer}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <Text style={styles.expandIcon}>
                    {expandedCategories.includes(category) ? "▼" : "▶"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.categoryControls}>
                  <TouchableOpacity
                    style={[
                      styles.categoryControlButton,
                      { backgroundColor: "#4CAF50" },
                    ]}
                    onPress={() => startAllTimersInCategory(category)}
                  >
                    <Text style={styles.categoryControlText}>Start All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.categoryControlButton,
                      { backgroundColor: "#FFC107" },
                    ]}
                    onPress={() => pauseAllTimersInCategory(category)}
                  >
                    <Text style={styles.categoryControlText}>Pause All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.categoryControlButton,
                      { backgroundColor: "#F44336" },
                    ]}
                    onPress={() => resetAllTimersInCategory(category)}
                  >
                    <Text style={styles.categoryControlText}>Reset All</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {expandedCategories.includes(category) && (
                <View style={styles.timersContainer}>
                  {timers.map((timer) => renderTimer(timer))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Button title="History" onPress={() => router.push("/history")} />

      <CompletionModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  list: {
    marginTop: 20,
  },
  categoryContainer: {
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryHeader: {
    padding: 15,
    backgroundColor: "#f0f0f0",
  },
  categoryTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  categoryControlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: "center",
  },
  categoryControlText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  expandIcon: {
    fontSize: 16,
  },
  timersContainer: {
    padding: 10,
  },
  timerCard: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  timerName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  timerDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerTime: {
    fontSize: 14,
    color: "#666",
  },
  timerStatus: {
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  controlButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    minWidth: 80,
    alignItems: "center",
  },
  controlButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 10,
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: "#666",
    minWidth: 40,
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    marginBottom: 20,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
  },
  modalBody: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  timerNameText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default HomeScreen;
