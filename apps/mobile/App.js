import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  entries: "tt_mobile_entries",
  geo: "tt_mobile_geo",
  token: "tt_mobile_token",
  user: "tt_mobile_user",
  apiBase: "tt_mobile_api_base"
};

const translations = {
  "en-US": {
    title: "Torre Tempo",
    status: "Status",
    clockIn: "Clock in",
    clockOut: "Clock out",
    startBreak: "Start break",
    endBreak: "End break",
    onShift: "On shift",
    offShift: "Off shift",
    entries: "Entries",
    login: "Sign in",
    email: "Email",
    password: "Password",
    apiBase: "API base",
    logout: "Logout"
  },
  "es-ES": {
    title: "Torre Tempo",
    status: "Estado",
    clockIn: "Fichar entrada",
    clockOut: "Fichar salida",
    startBreak: "Iniciar pausa",
    endBreak: "Finalizar pausa",
    onShift: "En jornada",
    offShift: "Fuera de jornada",
    entries: "Registros",
    login: "Entrar",
    email: "Email",
    password: "Contraseña",
    apiBase: "Base API",
    logout: "Salir"
  },
  "ca-ES": {
    title: "Torre Tempo",
    status: "Estat",
    clockIn: "Fitxar entrada",
    clockOut: "Fitxar sortida",
    startBreak: "Iniciar pausa",
    endBreak: "Finalitzar pausa",
    onShift: "En jornada",
    offShift: "Fora de jornada",
    entries: "Registres",
    login: "Entrar",
    email: "Email",
    password: "Contrasenya",
    apiBase: "Base API",
    logout: "Sortir"
  },
  "eu-ES": {
    title: "Torre Tempo",
    status: "Egoera",
    clockIn: "Sarrera fitxatu",
    clockOut: "Irteera fitxatu",
    startBreak: "Atseden hasi",
    endBreak: "Atseden amaitu",
    onShift: "Lanaldian",
    offShift: "Lanaldirik ez",
    entries: "Erregistroak",
    login: "Sartu",
    email: "Email",
    password: "Pasahitza",
    apiBase: "API oinarria",
    logout: "Irten"
  },
  "gl-ES": {
    title: "Torre Tempo",
    status: "Estado",
    clockIn: "Fichar entrada",
    clockOut: "Fichar saida",
    startBreak: "Iniciar pausa",
    endBreak: "Rematar pausa",
    onShift: "En xornada",
    offShift: "Fora de xornada",
    entries: "Rexistros",
    login: "Entrar",
    email: "Email",
    password: "Contrasinal",
    apiBase: "Base API",
    logout: "Sair"
  }
};

const defaultLang = "es-ES";

function t(lang, key) {
  return (translations[lang] && translations[lang][key]) || translations[defaultLang][key];
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [geoEvents, setGeoEvents] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [lang, setLang] = useState(defaultLang);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [apiBase, setApiBase] = useState("http://localhost:8080/api");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const storedEntries = await AsyncStorage.getItem(STORAGE_KEYS.entries);
    const storedGeo = await AsyncStorage.getItem(STORAGE_KEYS.geo);
    const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
    const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);
    const storedApiBase = await AsyncStorage.getItem(STORAGE_KEYS.apiBase);
    setEntries(storedEntries ? JSON.parse(storedEntries) : []);
    setGeoEvents(storedGeo ? JSON.parse(storedGeo) : []);
    setToken(storedToken || null);
    setUser(storedUser ? JSON.parse(storedUser) : null);
    if (storedApiBase) setApiBase(storedApiBase);
    if (storedToken && storedApiBase) {
      await fetchEntries(storedToken, storedApiBase);
    }
  };

  const saveState = async (updatedEntries, updatedGeo) => {
    await AsyncStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(updatedEntries));
    await AsyncStorage.setItem(STORAGE_KEYS.geo, JSON.stringify(updatedGeo));
  };

  const saveAuth = async (tokenValue, userValue) => {
    await AsyncStorage.setItem(STORAGE_KEYS.token, tokenValue);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userValue));
    await AsyncStorage.setItem(STORAGE_KEYS.apiBase, apiBase);
  };

  const apiFetch = async (path, options) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options && options.headers ? options.headers : {})
      }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(body.error || "Request failed");
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  };

  const login = async () => {
    setError("");
    try {
      const result = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(result.token);
      setUser(result.user);
      await saveAuth(result.token, result.user);
      await fetchEntries(result.token, apiBase);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.token);
    await AsyncStorage.removeItem(STORAGE_KEYS.user);
  };

  const fetchEntries = async (tokenValue, base) => {
    const response = await fetch(`${base}/time/entries`, {
      headers: { Authorization: `Bearer ${tokenValue}` }
    });
    const data = await response.json();
    setEntries(data || []);
    const open = (data || []).find((entry) => !entry.end);
    setCurrentEntryId(open ? open.id : null);
  };

  const getCurrentEntry = () => entries.find((entry) => entry.id === currentEntryId);

  const captureLocation = async (eventType, entryId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await apiFetch(`/time/entries/${entryId}/geo`, {
      method: "POST",
      body: JSON.stringify({
        event_type: eventType,
        timestamp: new Date().toISOString(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        device_id: "mobile"
      })
    });
  };

  const clockIn = async () => {
    if (!token) return;
    const entry = await apiFetch("/time/entries", { method: "POST" });
    await captureLocation("clock_in", entry.id);
    await fetchEntries(token, apiBase);
  };

  const clockOut = async () => {
    const entry = getCurrentEntry();
    if (!entry) return;
    await apiFetch(`/time/entries/${entry.id}`, { method: "PATCH" });
    await captureLocation("clock_out", entry.id);
    await fetchEntries(token, apiBase);
  };

  const startBreak = async () => {
    const entry = getCurrentEntry();
    if (!entry) return;
    await apiFetch(`/time/entries/${entry.id}/breaks`, { method: "POST" });
    await captureLocation("break_start", entry.id);
    await fetchEntries(token, apiBase);
  };

  const endBreak = async () => {
    const entry = getCurrentEntry();
    if (!entry) return;
    const activeBreak = (entry.breaks || []).find((b) => !b.end);
    if (!activeBreak) return;
    await apiFetch(`/time/entries/${entry.id}/breaks/${activeBreak.id}`, { method: "PATCH" });
    await captureLocation("break_end", entry.id);
    await fetchEntries(token, apiBase);
  };

  const statusText = getCurrentEntry() && !getCurrentEntry().end ? t(lang, "onShift") : t(lang, "offShift");
  const languages = ["es-ES", "ca-ES", "eu-ES", "gl-ES", "en-US"];
  const cycleLang = () => {
    const idx = languages.indexOf(lang);
    const next = languages[(idx + 1) % languages.length];
    setLang(next);
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t(lang, "title")}</Text>
          <TouchableOpacity style={styles.lang} onPress={cycleLang}>
            <Text style={styles.langText}>{lang}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loginCard}>
          <Text style={styles.sectionTitle}>{t(lang, "login")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t(lang, "apiBase")}
            value={apiBase}
            onChangeText={setApiBase}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t(lang, "email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t(lang, "password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primary} onPress={login}>
            <Text style={styles.primaryText}>{t(lang, "login")}</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t(lang, "title")}</Text>
        <TouchableOpacity style={styles.lang} onPress={cycleLang}>
          <Text style={styles.langText}>{lang}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.status}>{t(lang, "status")}: {statusText}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primary} onPress={clockIn}>
          <Text style={styles.primaryText}>{t(lang, "clockIn")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={startBreak}>
          <Text style={styles.buttonText}>{t(lang, "startBreak")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={endBreak}>
          <Text style={styles.buttonText}>{t(lang, "endBreak")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.danger} onPress={clockOut}>
          <Text style={styles.primaryText}>{t(lang, "clockOut")}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>{t(lang, "logout")}</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>{t(lang, "entries")}</Text>
      <FlatList
        data={[...entries].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Text>{new Date(item.start).toLocaleString()}</Text>
            <Text>{item.end ? new Date(item.end).toLocaleString() : "--"}</Text>
            <Text>Breaks: {item.breaks ? item.breaks.length : 0}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f7f1e6"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "600"
  },
  lang: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff"
  },
  langText: {
    fontSize: 12,
    fontWeight: "600"
  },
  status: {
    marginBottom: 16
  },
  buttonRow: {
    gap: 10,
    marginBottom: 20
  },
  primary: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#0f6b5f"
  },
  danger: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#b24b3e"
  },
  button: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff"
  },
  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  },
  buttonText: {
    color: "#1a1e1b",
    textAlign: "center"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  entry: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: "#fff"
  },
  loginCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 10
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d7cf",
    borderRadius: 10,
    padding: 10
  },
  error: {
    color: "#b24b3e"
  },
  logout: {
    marginBottom: 16
  },
  logoutText: {
    color: "#0f6b5f",
    fontWeight: "600"
  }
});
