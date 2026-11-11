import React, { useState, useEffect } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity, Platform,
  Alert, TextInput, StyleSheet
} from "react-native";
import { Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenHeaderBtn from "../../components/ScreenHeaderBtn";
import { Calendar } from "react-native-calendars";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS, FONT, SIZES } from "../../constants";
import { useTheme } from "../../context/ThemeProvider";

const isWeb = Platform.OS === "web";

// setTimeout no admite retrasos mayores a ~24.8 días: con valores más grandes se dispara de inmediato.
const MAX_WEB_TIMEOUT = 2147483647;

// Temporizadores activos en web (id del recordatorio -> id del timeout).
// Se guarda fuera del componente para no duplicarlos al volver a entrar a la pantalla.
const webTimers = {};

const showWebNotification = (reminder) => {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Recordatorio", { body: reminder.description });
    } else {
        window.alert(reminder.description);
    }
};

const scheduleWebNotification = (reminder) => {
    if (webTimers[reminder.id]) return;
    const delay = new Date(reminder.triggerDate) - new Date();
    if (delay <= 0 || delay > MAX_WEB_TIMEOUT) return;
    webTimers[reminder.id] = setTimeout(() => {
        delete webTimers[reminder.id];
        showWebNotification(reminder);
    }, delay);
};

// "2026-11-11" con new Date() se interpreta en UTC y en zonas como UTC-5 cae el día anterior.
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const DailyReminders = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark"
    const [reminders, setReminders] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [manualTime, setManualTime] = useState("");
    const [userDetails, setUserDetails] = useState(null);
    const textColor = isDarkMode ? COLORS.darkText : COLORS.primary;

    const requestPermissions = async () => {
        if (isWeb) {
            if (!("Notification" in window)) {
                alert("Tu navegador no soporta notificaciones. Los recordatorios se mostrarán como alertas.");
                return false;
            }
            if (Notification.permission === "granted") return true;
            if (Notification.permission === "denied") {
                alert("Las notificaciones están bloqueadas. Actívalas en la configuración del navegador para este sitio.");
                return false;
            }
            const result = await Notification.requestPermission();
            return result === "granted";
        }

        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso no concedido', 'Por favor, permite las notificaciones para recibir recordatorios.');
                return false;
            }
            return true;
        } catch (error) {
            console.error("Error solicitando permisos de notificaciones:", error);
            return false;
        }
    };

    useEffect(() => {
        // En web el navegador exige que el permiso se pida tras una acción del usuario,
        // así que allí se solicita al pulsar "Agregar Recordatorio".
        if (!isWeb) requestPermissions();
        loadUserDetails();
        loadReminders();
    }, []);

    const loadUserDetails = async () => {
        const user = await AsyncStorage.getItem("userDetails");
        setUserDetails(user ? JSON.parse(user) : {});
    };

    const loadReminders = async () => {
        const storedReminders = await AsyncStorage.getItem("reminders");
        const allReminders = storedReminders ? JSON.parse(storedReminders) : [];
        const futureReminders = allReminders.filter((reminder) => new Date(reminder.triggerDate) > new Date());
        setReminders(futureReminders);
        // En web los temporizadores se pierden al recargar la página: se vuelven a programar.
        if (isWeb) futureReminders.forEach(scheduleWebNotification);
    };


    const handleAddReminder = async () => {
        if (!selectedDate) {
            alert("Please select a date.");
            return;
        }

        const [inputHours, inputMinutes] = manualTime.split(":").map((item) => parseInt(item, 10));
        const triggerDate = parseLocalDate(selectedDate);

        if (!isNaN(inputHours) && !isNaN(inputMinutes)) {
            triggerDate.setHours(inputHours, inputMinutes, 0, 0);
        } else {
            triggerDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        }

        if (triggerDate <= new Date()) {
            alert("Por favor, selecciona una hora futura.");
            return;
        }

        const newReminder = {
            id: Date.now(),
            date: selectedDate,
            time: manualTime || triggerDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            description: `Recordatorio: ¡Hora para tu tarea diaria!`,
            triggerDate: triggerDate.toISOString(),
        };

        if (isWeb && triggerDate - new Date() > MAX_WEB_TIMEOUT) {
            alert("En la versión web solo se pueden programar recordatorios para los próximos 24 días.");
            return;
        }

        try {
            if (isWeb) await requestPermissions();
            newReminder.notificationId = await scheduleNotification(newReminder);
            const updatedReminders = [...reminders, newReminder];
            await AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
            setReminders(updatedReminders);
            alert("¡Recordatorio agregado con éxito!");
        } catch (error) {
            console.error("Error al agregar el recordatorio:", error);
            alert("Error al agregar el recordatorio.");
        }
    }

    const scheduleNotification = async (reminder) => {
        if (isWeb) {
            scheduleWebNotification(reminder);
            return null;
        }
        return await Notifications.scheduleNotificationAsync({
            content: { title: "Recordatorio", body: reminder.description },
            trigger: { date: new Date(reminder.triggerDate) },
        });
    }

    const deleteReminder = async (id) => {
        const reminder = reminders.find((item) => item.id === id);
        if (isWeb) {
            clearTimeout(webTimers[id]);
            delete webTimers[id];
        } else if (reminder?.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        }
        const updatedReminders = reminders.filter((reminder) => reminder.id !== id);
        await AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
        setReminders(updatedReminders);
    };

    const Reminder = ({ item }) => (
        <View style={styles.reminderContainer}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.date}>{item.date} - {item.time}</Text>
            <TouchableOpacity onPress={() => deleteReminder(item.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );

    return(
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? COLORS.darkBackground : COLORS.lightWhite }}>
            <Stack.Screen options={{ headerTitle: "Recordatorios Diarios" }} />
            <ScreenHeaderBtn/>
            <ScrollView contentContainerStyle={{ padding: SIZES.medium }}>
                <Text style={[styles.title, { color: textColor }]}>Recordatorios</Text>
                <Calendar
                    onDayPress={(day) => setSelectedDate(day.dateString)}
                    markedDates={{ [selectedDate]: { selected: true, selectedColor: COLORS.primary } }}
                />
                {!isWeb && showTimePicker && (
                    <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        onChange={(event, selected) => {
                            setSelectedTime(selected || selectedTime);
                            setShowTimePicker(false);
                        }}
                    />
                )}
                <TextInput
                    placeholder="Ingrese Hora (HH:mm)"
                    value={manualTime}
                    onChangeText={setManualTime}
                    keyboardType="numeric"
                    maxLength={5}
                    style={styles.input}
                />
                <Text style={styles.selected}>Fecha: {selectedDate || "Ninguna"}</Text>
                <Text style={styles.selected}>Hora: {manualTime || selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>

                <TouchableOpacity onPress={handleAddReminder} style={styles.button}>
                    <Text style={styles.buttonText}>Agregar Recordatorio</Text>
                </TouchableOpacity>

                <Text style={styles.reminderHeader}>Todos los Recordatorios:</Text>
                {reminders.length > 0 ? reminders.map((rem) => 
                    <Reminder key={rem.id} item={rem} />) : <Text>Aún no hay recordatorios.</Text>
                }
            </ScrollView>
        </SafeAreaView>
    )
}

export default DailyReminders;

const styles = StyleSheet.create({
  reminderContainer: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.small, padding: SIZES.small, marginVertical: SIZES.small
  },
  title: {
    fontSize: SIZES.xLarge,
    fontFamily: FONT.bold,
  },
  description: { color: COLORS.lightWhite, fontWeight: "bold" },
  date: { color: COLORS.darkText, fontSize: SIZES.small },
  input: { borderColor: COLORS.primary, borderWidth: 1, padding: SIZES.small, marginVertical: SIZES.small },
  selected: { fontSize: SIZES.medium, marginVertical: SIZES.small, color: COLORS.primary },
  button: { backgroundColor: COLORS.primary, padding: SIZES.medium, borderRadius: SIZES.medium, alignItems: "center" },
  buttonText: { color: COLORS.lightWhite, fontWeight: "bold" },
  deleteButton: { marginTop: SIZES.small, alignSelf: "flex-end" },
  deleteText: { color: "#FE7654", fontWeight: "bold" },
  reminderHeader: { fontSize: SIZES.large, fontWeight: "bold", color: COLORS.primary, marginVertical: SIZES.medium },
});

