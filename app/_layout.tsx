import { Stack, Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="create-tracker"
        options={{
          title: "Create Timer",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "History",
          headerTitleAlign: "center",
        }}
      />
    </Stack>
  );
}
