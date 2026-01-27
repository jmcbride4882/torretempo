import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Modal,
  Pressable
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  entries: "tt_mobile_entries",
  geo: "tt_mobile_geo",
  token: "tt_mobile_token",
  user: "tt_mobile_user",
  apiBase: "tt_mobile_api_base",
  environment: "tt_mobile_environment",
  customApiBase: "tt_mobile_custom_api_base"
};

const DEFAULT_ENVIRONMENT = "production";

const ENVIRONMENT_MAP = {
  production: {
    key: "production",
    labelKey: "production",
    apiBase: "https://time.lsltgroup.es/api"
  },
  vps: {
    key: "vps",
    labelKey: "vps",
    apiBase: "https://vps-463f2901.vps.ovh.net/api"
  },
  custom: {
    key: "custom",
    labelKey: "custom",
    apiBase: ""
  }
};

const ENVIRONMENT_ORDER = ["production", "vps", "custom"];

const normalizeApiBase = (value) => {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "");
};

const getApiBase = (environmentKey, customValue) => {
  if (environmentKey === "custom") return normalizeApiBase(customValue);
  const env = ENVIRONMENT_MAP[environmentKey] || ENVIRONMENT_MAP[DEFAULT_ENVIRONMENT];
  return env.apiBase;
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
    logout: "Logout",
    apiEnvironment: "API environment",
    production: "Production",
    vps: "VPS",
    custom: "Custom",
    apiBaseRequired: "API base is required"
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
    logout: "Salir",
    apiEnvironment: "Entorno API",
    production: "Producción",
    vps: "VPS",
    custom: "Personalizado",
    apiBaseRequired: "La base API es obligatoria"
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
    logout: "Sortir",
    apiEnvironment: "Entorn API",
    production: "Producció",
    vps: "VPS",
    custom: "Personalitzat",
    apiBaseRequired: "La base API és obligatòria"
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
    logout: "Irten",
    apiEnvironment: "API ingurunea",
    production: "Produkzioa",
    vps: "VPS",
    custom: "Pertsonalizatua",
    apiBaseRequired: "API oinarria beharrezkoa da"
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
    logout: "Sair",
    apiEnvironment: "Contorno da API",
    production: "Produción",
    vps: "VPS",
    custom: "Personalizado",
    apiBaseRequired: "A base API é obrigatoria"
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
  const [environment, setEnvironment] = useState(DEFAULT_ENVIRONMENT);
  const [customApiBase, setCustomApiBase] = useState("");
  const [environmentPickerVisible, setEnvironmentPickerVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const apiBase = getApiBase(environment, customApiBase);
  const environmentLabelKey = (ENVIRONMENT_MAP[environment] || ENVIRONMENT_MAP[DEFAULT_ENVIRONMENT]).labelKey;

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const storedEntries = await AsyncStorage.getItem(STORAGE_KEYS.entries);
    const storedGeo = await AsyncStorage.getItem(STORAGE_KEYS.geo);
    const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
    const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);
    const storedApiBase = await AsyncStorage.getItem(STORAGE_KEYS.apiBase);
    const storedEnvironment = await AsyncStorage.getItem(STORAGE_KEYS.environment);
    const storedCustomApiBase = await AsyncStorage.getItem(STORAGE_KEYS.customApiBase);
    setEntries(storedEntries ? JSON.parse(storedEntries) : []);
    setGeoEvents(storedGeo ? JSON.parse(storedGeo) : []);
    setToken(storedToken || null);
    setUser(storedUser ? JSON.parse(storedUser) : null);
    let resolvedEnvironment = storedEnvironment || DEFAULT_ENVIRONMENT;
    let resolvedCustomApiBase = storedCustomApiBase || "";
    if (storedEnvironment === "custom" && !storedCustomApiBase && storedApiBase) {
      resolvedCustomApiBase = normalizeApiBase(storedApiBase);
    }
    if (!storedEnvironment && storedApiBase) {
      const normalizedStoredApiBase = normalizeApiBase(storedApiBase);
      if (normalizedStoredApiBase === ENVIRONMENT_MAP.production.apiBase) {
        resolvedEnvironment = "production";
      } else if (normalizedStoredApiBase === ENVIRONMENT_MAP.vps.apiBase) {
        resolvedEnvironment = "vps";
      } else {
        resolvedEnvironment = "custom";
        resolvedCustomApiBase = normalizedStoredApiBase;
      }
    }
    setEnvironment(resolvedEnvironment);
    setCustomApiBase(resolvedCustomApiBase);
    const resolvedApiBase = getApiBase(resolvedEnvironment, resolvedCustomApiBase);
    if (storedToken && resolvedApiBase) {
      await fetchEntries(storedToken, resolvedApiBase);
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
    await AsyncStorage.setItem(STORAGE_KEYS.environment, environment);
    await AsyncStorage.setItem(STORAGE_KEYS.customApiBase, customApiBase);
  };

  const persistEnvironment = async (nextEnvironment, nextCustomApiBase) => {
    await AsyncStorage.setItem(STORAGE_KEYS.environment, nextEnvironment);
    await AsyncStorage.setItem(STORAGE_KEYS.customApiBase, nextCustomApiBase || "");
    await AsyncStorage.setItem(STORAGE_KEYS.apiBase, getApiBase(nextEnvironment, nextCustomApiBase));
  };

  const clearAuth = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.token);
    await AsyncStorage.removeItem(STORAGE_KEYS.user);
  };

  const clearCachedData = async () => {
    setEntries([]);
    setGeoEvents([]);
    setCurrentEntryId(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.entries);
    await AsyncStorage.removeItem(STORAGE_KEYS.geo);
  };

  const handleEnvironmentChange = async (nextEnvironment) => {
    if (nextEnvironment === environment) {
      setEnvironmentPickerVisible(false);
      return;
    }
    setEnvironment(nextEnvironment);
    await persistEnvironment(nextEnvironment, customApiBase);
    await clearAuth();
    await clearCachedData();
    setError("");
    setEnvironmentPickerVisible(false);
  };

  const handleCustomApiBaseChange = async (value) => {
    setCustomApiBase(value);
    await persistEnvironment(environment, value);
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
    if (!apiBase) {
      setError(t(lang, "apiBaseRequired"));
      return;
    }
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
    await clearAuth();
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

  const environmentModal = (
    <Modal
      visible={environmentPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setEnvironmentPickerVisible(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setEnvironmentPickerVisible(false)}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>{t(lang, "apiEnvironment")}</Text>
          {ENVIRONMENT_ORDER.map((key) => {
            const option = ENVIRONMENT_MAP[key];
            const isSelected = key === environment;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.modalOption, isSelected ? styles.modalOptionSelected : null]}
                onPress={() => handleEnvironmentChange(key)}
              >
                <Text style={styles.modalOptionText}>{t(lang, option.labelKey)}</Text>
                {option.apiBase ? (
                  <Text style={styles.modalOptionSubtext}>{option.apiBase}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );

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
          <View style={styles.envBlock}>
            <Text style={styles.fieldLabel}>{t(lang, "apiEnvironment")}</Text>
            <TouchableOpacity style={styles.select} onPress={() => setEnvironmentPickerVisible(true)}>
              <Text style={styles.selectText}>{t(lang, environmentLabelKey)}</Text>
              <Text style={styles.selectSubtext}>{apiBase || t(lang, "apiBase")}</Text>
            </TouchableOpacity>
            {environment === "custom" ? (
              <TextInput
                style={styles.input}
                placeholder={t(lang, "apiBase")}
                value={customApiBase}
                onChangeText={handleCustomApiBaseChange}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            ) : null}
          </View>
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
        {environmentModal}
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
      <View style={styles.envCard}>
        <View style={styles.envBlock}>
          <Text style={styles.fieldLabel}>{t(lang, "apiEnvironment")}</Text>
          <TouchableOpacity style={styles.select} onPress={() => setEnvironmentPickerVisible(true)}>
            <Text style={styles.selectText}>{t(lang, environmentLabelKey)}</Text>
            <Text style={styles.selectSubtext}>{apiBase || t(lang, "apiBase")}</Text>
          </TouchableOpacity>
          {environment === "custom" ? (
            <TextInput
              style={styles.input}
              placeholder={t(lang, "apiBase")}
              value={customApiBase}
              onChangeText={handleCustomApiBaseChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          ) : null}
        </View>
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
      {environmentModal}
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
  envCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12
  },
  envBlock: {
    gap: 8
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1e1b"
  },
  select: {
    borderWidth: 1,
    borderColor: "#d1d7cf",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff"
  },
  selectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1e1b"
  },
  selectSubtext: {
    fontSize: 12,
    color: "#5a6158",
    marginTop: 4
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  modalOption: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e6dd"
  },
  modalOptionSelected: {
    borderColor: "#0f6b5f",
    backgroundColor: "#e8f2ef"
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: "600"
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: "#5a6158",
    marginTop: 4
  }
});
