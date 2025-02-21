import React from "react";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

const ProgressBar = ({ progress }: { progress: number }) => {
  const [width] = useState(new Animated.Value(0)); // Start from 0

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default ProgressBar;
