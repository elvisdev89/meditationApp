import { View, Image, TouchableOpacity, Text, SafeAreaView, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeProvider";
import ScreenHeaderBtn from "../../components/ScreenHeaderBtn";
import { COLORS, FONT, SIZES, SHADOWS } from "../../constants/theme";
import icons from "../../constants/icons";

const SETTINGS_OPTIONS = [
    {
        title: "Tema",
        description: "Cambia entre modo claro y oscuro",
        icon: icons.settings,
        route: "/settings/ThemeChange",
    },
    {
        title: "Recordatorios",
        description: "Programa recordatorios diarios para meditar",
        icon: icons.clock,
        route: "/settings/DailyReminders",
    },
    {
        title: "Favoritos",
        description: "Tus meditaciones guardadas",
        icon: icons.heart,
        route: "/settings/Favourites",
    },
];

function SettingsIndex() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    const textColor = isDarkMode ? COLORS.darkText : COLORS.primary;
    const subtitleColor = isDarkMode ? COLORS.gray2 : COLORS.gray;

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: isDarkMode ? COLORS.darkBackground : COLORS.lightWhite,
            }}
        >
            <ScreenHeaderBtn />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.container}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Configuración</Text>

                    {SETTINGS_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.route}
                            style={[
                                styles.card,
                                { backgroundColor: isDarkMode ? COLORS.secondary : "#FFF" },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => router.push(option.route)}
                        >
                            <View style={styles.iconContainer}>
                                <Image source={option.icon} style={styles.icon} />
                            </View>

                            <View style={styles.textContainer}>
                                <Text style={[styles.title, { color: textColor }]}>{option.title}</Text>
                                <Text style={[styles.description, { color: subtitleColor }]} numberOfLines={1}>
                                    {option.description}
                                </Text>
                            </View>

                            <Image
                                source={icons.left}
                                style={[styles.chevron, { tintColor: subtitleColor }]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

export default SettingsIndex;

const styles = StyleSheet.create({
    container: {
        padding: SIZES.medium,
    },
    headerTitle: {
        fontSize: SIZES.xLarge,
        fontFamily: FONT.bold,
        marginTop: SIZES.small,
        marginBottom: SIZES.large,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: SIZES.medium,
        marginBottom: SIZES.medium,
        borderRadius: SIZES.small,
        ...SHADOWS.small,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: SIZES.medium,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
    },
    icon: {
        width: "60%",
        height: "60%",
        resizeMode: "contain",
    },
    textContainer: {
        flex: 1,
        marginHorizontal: SIZES.medium,
    },
    title: {
        fontSize: SIZES.medium,
        fontFamily: FONT.bold,
    },
    description: {
        fontSize: SIZES.small + 2,
        fontFamily: FONT.regular,
        marginTop: 3,
    },
    chevron: {
        width: 16,
        height: 16,
        resizeMode: "contain",
        transform: [{ rotate: "180deg" }],
    },
});
