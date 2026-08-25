import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { syncQueuedSubmissions } from './src/api';
import { initializeDatabase, listAssignments, listSubmissions, saveSubmission } from './src/storage';
import type { Assignment, LocationPoint, QueuedSubmission } from './src/types';

type Screen = 'home' | 'capture' | 'queue';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<QueuedSubmission[]>([]);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    const [nextAssignments, nextSubmissions] = await Promise.all([listAssignments(), listSubmissions()]);
    setAssignments(nextAssignments);
    setSubmissions(nextSubmissions);
  }

  useEffect(() => {
    initializeDatabase().then(refresh).catch((error) => Alert.alert('Database error', String(error))).finally(() => setLoading(false));
    Network.getNetworkStateAsync().then((state) => setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false)));
    const listener = Network.addNetworkStateListener((state) => setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false)));
    return () => listener.remove();
  }, []);

  const queuedCount = useMemo(() => submissions.filter((item) => item.syncState === 'QUEUED').length, [submissions]);

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await syncQueuedSubmissions(submissions);
      await refresh();
      if (result.reason === 'empty') Alert.alert('Everything is synced', 'There are no pending field records.');
      if (result.reason === 'offline') Alert.alert('Saved offline', 'Your records are safe on this device. Sync when a connection is available.');
      if (result.reason === 'success') Alert.alert('Sync complete', `${result.synced} field record${result.synced === 1 ? '' : 's'} sent for consultant review.`);
    } catch {
      Alert.alert('Server not reachable', 'The field records remain safely queued on this device. Check the API address or try again later.');
    } finally {
      setSyncing(false);
    }
  }

  function openAssignment(assignment: Assignment) {
    setSelected(assignment);
    setScreen('capture');
  }

  if (loading) return <SafeAreaProvider initialMetrics={initialWindowMetrics}><SafeAreaView style={styles.loading}><ActivityIndicator color="#174D3C" /><Text>Preparing offline workspace…</Text></SafeAreaView></SafeAreaProvider>;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Pressable onPress={() => setScreen('home')} style={styles.brand}><Text style={styles.brandMark}>R</Text><Text style={styles.brandName}>Rook Field</Text></Pressable>
          <View style={[styles.connectionPill, !isOnline && styles.connectionOffline]}><View style={[styles.connectionDot, !isOnline && styles.connectionDotOffline]} /><Text style={styles.connectionText}>{isOnline === null ? 'Checking' : isOnline ? 'Online' : 'Offline ready'}</Text></View>
        </View>
        {screen === 'home' && <Home assignments={assignments} queuedCount={queuedCount} onOpen={openAssignment} onQueue={() => setScreen('queue')} />}
        {screen === 'capture' && selected && <Capture assignment={selected} onBack={() => setScreen('home')} onSaved={async () => { await refresh(); setScreen('queue'); }} />}
        {screen === 'queue' && <Queue submissions={submissions} queuedCount={queuedCount} syncing={syncing} isOnline={Boolean(isOnline)} onBack={() => setScreen('home')} onSync={syncNow} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Home({ assignments, queuedCount, onOpen, onQueue }: { assignments: Assignment[]; queuedCount: number; onOpen: (item: Assignment) => void; onQueue: () => void }) {
  return <ScrollView contentContainerStyle={styles.screen}>
    <View style={styles.greeting}><Text style={styles.eyebrow}>TUESDAY · AUGUST 25</Text><Text style={styles.title}>Your field work.</Text><Text style={styles.subtitle}>Assignments are cached on this device, so you can keep working outside coverage.</Text></View>
    {queuedCount > 0 && <Pressable style={styles.syncBanner} onPress={onQueue}><View><Text style={styles.syncBannerLabel}>READY TO SYNC</Text><Text style={styles.syncBannerTitle}>{queuedCount} field record{queuedCount === 1 ? '' : 's'} waiting</Text></View><Text style={styles.syncArrow}>→</Text></Pressable>}
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Assigned to you</Text><Text style={styles.count}>{assignments.length}</Text></View>
    {assignments.map((assignment) => <Pressable key={assignment.id} style={({ pressed }) => [styles.assignment, pressed && styles.pressed]} onPress={() => onOpen(assignment)}>
      <View style={styles.assignmentTop}><Text style={[styles.riskLabel, assignment.risk === 'HIGH' ? styles.highRisk : styles.mediumRisk]}>{assignment.risk} PRIORITY</Text><Text style={styles.due}>{assignment.dueLabel}</Text></View>
      <Text style={styles.assignmentFacility}>{assignment.facility}</Text><Text style={styles.assignmentTitle}>{assignment.title}</Text>
      <View style={styles.evidenceRow}><Text style={styles.evidenceIcon}>◎</Text><Text style={styles.evidence}>{assignment.evidenceRequired}</Text></View>
      <View style={styles.openRow}><Text>Open assignment</Text><Text>→</Text></View>
    </Pressable>)}
    <View style={styles.offlineNote}><Text style={styles.offlineIcon}>↯</Text><View><Text style={styles.offlineTitle}>Designed for remote sites</Text><Text style={styles.offlineText}>Records live in a local SQLite database first. Losing signal never loses field work.</Text></View></View>
  </ScrollView>;
}

function Capture({ assignment, onBack, onSaved }: { assignment: Assignment; onBack: () => void; onSaved: () => void }) {
  const [checked, setChecked] = useState([false, false, false]);
  const [reading, setReading] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const isFugitiveSurvey = assignment.id === 'obl-fugitive-01';
  const requiresPhoto = assignment.evidenceRequired.toLowerCase().includes('photo');
  const checklist = isFugitiveSurvey
    ? ['Survey route and component inventory are complete', 'All detected leaks and exceptions are documented', 'Repair status and follow-up dates are recorded']
    : ['Discharge point is accessible and unobstructed', 'No visible sheen, odour or abnormal colour observed', 'Reading collected using the approved field method'];
  const inspectionType = isFugitiveSurvey ? 'Quarterly LDAR survey' : 'Monthly wastewater inspection';
  const readingLabel = isFugitiveSurvey ? 'Survey result or component count' : 'Discharge reading or observation';
  const readingPlaceholder = isFugitiveSurvey ? 'e.g. 426 components · 0 exceedances' : 'e.g. pH 7.4';

  async function capturePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Camera permission needed', 'Allow camera access to attach field evidence.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (!result.canceled) setPhotos((current) => [...current, result.assets[0].uri]);
  }

  async function captureLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('Location permission needed', 'Allow location while using the app to geotag this inspection.');
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: point.coords.latitude, longitude: point.coords.longitude });
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!checked.every(Boolean)) return Alert.alert('Checklist incomplete', 'Complete each inspection check before saving.');
    if (!reading.trim()) return Alert.alert('Reading required', 'Enter the measured result before saving.');
    if (requiresPhoto && photos.length === 0) return Alert.alert('Site photo required', 'Attach at least one photo before saving this inspection.');
    setSaving(true);
    try {
      await saveSubmission({
        localId: `local-${Date.now()}`,
        obligationId: assignment.id,
        inspector: 'Jordan Lee',
        completedAt: new Date().toISOString(),
        notes: notes.trim(),
        reading: reading.trim(),
        photoUris: photos,
        location,
        checklistComplete: true,
      });
      Alert.alert('Saved on this device', 'The inspection is safe offline and ready to sync.', [{ text: 'View sync queue', onPress: onSaved }]);
    } catch (error) {
      Alert.alert('Could not save', String(error));
    } finally {
      setSaving(false);
    }
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.screen}>
    <Pressable onPress={onBack}><Text style={styles.back}>← Assignments</Text></Pressable>
    <Text style={styles.eyebrow}>{assignment.facility}</Text><Text style={styles.captureTitle}>{assignment.title}</Text><Text style={styles.captureMeta}>{assignment.dueLabel} · {inspectionType}</Text>
    <View style={styles.formCard}><Text style={styles.formStep}>01 · CHECKLIST</Text>{checklist.map((label, index) => <Pressable key={label} style={styles.checkRow} onPress={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))}><View style={[styles.checkbox, checked[index] && styles.checkboxChecked]}><Text>{checked[index] ? '✓' : ''}</Text></View><Text style={[styles.checkLabel, checked[index] && styles.checkLabelDone]}>{label}</Text></Pressable>)}</View>
    <View style={styles.formCard}><Text style={styles.formStep}>02 · READING</Text><Text style={styles.inputLabel}>{readingLabel}</Text><TextInput value={reading} onChangeText={setReading} placeholder={readingPlaceholder} placeholderTextColor="#98A39E" style={styles.input} /><Text style={styles.inputLabel}>Field notes</Text><TextInput value={notes} onChangeText={setNotes} multiline placeholder="Exceptions, maintenance needs, or context…" placeholderTextColor="#98A39E" style={[styles.input, styles.notesInput]} /></View>
    <View style={styles.formCard}><Text style={styles.formStep}>03 · EVIDENCE</Text><View style={styles.evidenceButtons}><Pressable style={styles.evidenceButton} onPress={capturePhoto}><Text style={styles.evidenceButtonIcon}>▣</Text><Text style={styles.evidenceButtonTitle}>Take photo</Text><Text style={styles.evidenceButtonMeta}>{photos.length ? `${photos.length} attached` : 'Camera evidence'}</Text></Pressable><Pressable style={styles.evidenceButton} onPress={captureLocation}><Text style={styles.evidenceButtonIcon}>⌖</Text><Text style={styles.evidenceButtonTitle}>{locating ? 'Locating…' : 'Add location'}</Text><Text style={styles.evidenceButtonMeta}>{location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Optional GPS tag'}</Text></Pressable></View>{photos.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false}>{photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.thumbnail} />)}</ScrollView>}</View>
    <Pressable disabled={saving} style={[styles.saveButton, saving && styles.disabled]} onPress={save}>{saving ? <ActivityIndicator color="white" /> : <><Text style={styles.saveButtonText}>Save inspection offline</Text><Text style={styles.saveButtonText}>→</Text></>}</Pressable>
  </ScrollView></KeyboardAvoidingView>;
}

function Queue({ submissions, queuedCount, syncing, isOnline, onBack, onSync }: { submissions: QueuedSubmission[]; queuedCount: number; syncing: boolean; isOnline: boolean; onBack: () => void; onSync: () => void }) {
  return <ScrollView contentContainerStyle={styles.screen}>
    <Pressable onPress={onBack}><Text style={styles.back}>← Assignments</Text></Pressable><Text style={styles.eyebrow}>OFFLINE-FIRST DELIVERY</Text><Text style={styles.title}>Sync queue.</Text><Text style={styles.subtitle}>{queuedCount ? 'Your work is stored locally until the server confirms receipt.' : 'Every field record has reached the office console.'}</Text>
    <Pressable disabled={syncing || queuedCount === 0} style={[styles.saveButton, (syncing || queuedCount === 0) && styles.disabled]} onPress={onSync}>{syncing ? <ActivityIndicator color="white" /> : <><Text style={styles.saveButtonText}>{isOnline ? 'Sync pending records' : 'Offline · records are safe'}</Text><Text style={styles.saveButtonText}>{queuedCount}</Text></>}</Pressable>
    <View style={styles.queueList}>{submissions.length === 0 ? <View style={styles.empty}><Text style={styles.emptyMark}>✓</Text><Text style={styles.emptyTitle}>Nothing waiting</Text><Text style={styles.emptyText}>Complete an assignment and it will appear here.</Text></View> : submissions.map((item) => <View style={styles.queueItem} key={item.localId}><View style={[styles.queueState, item.syncState === 'SYNCED' && styles.queueSynced]}><Text>{item.syncState === 'SYNCED' ? '✓' : '↑'}</Text></View><View style={styles.queueBody}><Text style={styles.queueTitle}>{item.reading}</Text><Text style={styles.queueMeta}>{new Date(item.completedAt).toLocaleString()} · {item.photoUris.length} photo{item.photoUris.length === 1 ? '' : 's'}</Text></View><Text style={[styles.queueStatus, item.syncState === 'SYNCED' && styles.queueStatusSynced]}>{item.syncState}</Text></View>)}</View>
    <View style={styles.auditNote}><Text style={styles.auditTitle}>No duplicate submissions</Text><Text style={styles.auditText}>Each device record has a unique local ID. The API uses it as an idempotency key, so retrying a sync is safe.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F4' },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#F5F7F4' },
  topBar: { minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E0E6E2', backgroundColor: '#F9FBF8' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 32, height: 32, paddingTop: 6, borderRadius: 10, borderBottomRightRadius: 3, overflow: 'hidden', textAlign: 'center', backgroundColor: '#CDE87D', color: '#173E32', fontWeight: '800' },
  brandName: { color: '#17231F', fontSize: 16, fontWeight: '700', letterSpacing: -0.4 },
  connectionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EAF5EB', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 50 },
  connectionOffline: { backgroundColor: '#FFF1DF' },
  connectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#579A69' },
  connectionDotOffline: { backgroundColor: '#D28A34' },
  connectionText: { fontSize: 10, color: '#4F665C', fontWeight: '700' },
  screen: { padding: 20, paddingBottom: 48 },
  greeting: { marginBottom: 22 },
  eyebrow: { color: '#728079', fontSize: 10, letterSpacing: 1.35, fontWeight: '800', marginBottom: 8 },
  title: { color: '#17231F', fontSize: 31, lineHeight: 36, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { color: '#6F7D77', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 345 },
  syncBanner: { padding: 17, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 15, backgroundColor: '#173F33' },
  syncBannerLabel: { color: '#AFC3BA', fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
  syncBannerTitle: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 4 },
  syncArrow: { color: '#CDE87D', fontSize: 20 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, color: '#26342E', fontWeight: '700' },
  count: { minWidth: 24, paddingVertical: 4, textAlign: 'center', backgroundColor: '#E5EBE7', borderRadius: 7, fontSize: 10, fontWeight: '700' },
  assignment: { marginBottom: 12, padding: 17, borderWidth: 1, borderColor: '#DEE5E0', borderRadius: 16, backgroundColor: 'white' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.995 }] },
  assignmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  riskLabel: { paddingVertical: 5, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  highRisk: { color: '#98483C', backgroundColor: '#FAE9E5' },
  mediumRisk: { color: '#94602D', backgroundColor: '#FFF1DE' },
  due: { color: '#7B8882', fontSize: 10, fontWeight: '600' },
  assignmentFacility: { color: '#66756E', fontSize: 10, marginBottom: 5 },
  assignmentTitle: { color: '#1D2A25', fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.35 },
  evidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 15 },
  evidenceIcon: { color: '#507A69', fontSize: 15 },
  evidence: { flex: 1, color: '#728079', fontSize: 11, lineHeight: 16 },
  openRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EDF1EE', flexDirection: 'row', justifyContent: 'space-between' },
  offlineNote: { flexDirection: 'row', gap: 12, padding: 16, marginTop: 10, backgroundColor: '#EDF3E9', borderRadius: 14 },
  offlineIcon: { width: 30, height: 30, paddingTop: 5, borderRadius: 9, overflow: 'hidden', textAlign: 'center', backgroundColor: '#D5E8AE', color: '#2C5645', fontWeight: '800' },
  offlineTitle: { fontSize: 11, fontWeight: '800', color: '#30423A', marginBottom: 4 },
  offlineText: { maxWidth: 275, color: '#66756E', fontSize: 10, lineHeight: 15 },
  back: { color: '#426957', fontSize: 12, fontWeight: '700', marginBottom: 25 },
  captureTitle: { color: '#17231F', fontSize: 25, lineHeight: 30, fontWeight: '700', letterSpacing: -0.8 },
  captureMeta: { color: '#7A8781', fontSize: 11, marginTop: 7, marginBottom: 20 },
  formCard: { marginBottom: 12, padding: 17, borderWidth: 1, borderColor: '#DEE5E0', borderRadius: 16, backgroundColor: 'white' },
  formStep: { color: '#63736B', fontSize: 9, letterSpacing: 1.25, fontWeight: '800', marginBottom: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EDF1EE' },
  checkbox: { width: 23, height: 23, borderWidth: 1, borderColor: '#BFC9C3', borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: '#B8D36E', backgroundColor: '#CDE87D' },
  checkLabel: { flex: 1, color: '#43514B', fontSize: 12, lineHeight: 18 },
  checkLabelDone: { color: '#6E7D76' },
  inputLabel: { color: '#53625B', fontSize: 10, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 46, marginBottom: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: '#DDE5E0', borderRadius: 10, color: '#1E2D27', backgroundColor: '#FAFBFA', fontSize: 13 },
  notesInput: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top', marginBottom: 0 },
  evidenceButtons: { flexDirection: 'row', gap: 9 },
  evidenceButton: { flex: 1, minHeight: 104, padding: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: '#BFCBC4', borderRadius: 12, justifyContent: 'center' },
  evidenceButtonIcon: { color: '#426B59', fontSize: 18, marginBottom: 7 },
  evidenceButtonTitle: { color: '#34463E', fontSize: 11, fontWeight: '800' },
  evidenceButtonMeta: { color: '#7B8882', fontSize: 8, marginTop: 4 },
  thumbnail: { width: 72, height: 72, marginTop: 12, marginRight: 8, borderRadius: 9 },
  saveButton: { minHeight: 52, marginTop: 7, paddingHorizontal: 18, borderRadius: 13, backgroundColor: '#174D3C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saveButtonText: { color: 'white', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.48 },
  queueList: { marginTop: 16, borderWidth: 1, borderColor: '#DEE5E0', borderRadius: 16, backgroundColor: 'white', overflow: 'hidden' },
  queueItem: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#EDF1EE' },
  queueState: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFF1DE' },
  queueSynced: { backgroundColor: '#EAF5EB' },
  queueBody: { flex: 1 },
  queueTitle: { color: '#25352E', fontSize: 12, fontWeight: '800' },
  queueMeta: { color: '#7A8881', fontSize: 9, marginTop: 4 },
  queueStatus: { color: '#9B672F', fontSize: 8, fontWeight: '800' },
  queueStatusSynced: { color: '#4C7657' },
  empty: { padding: 35, alignItems: 'center' },
  emptyMark: { width: 42, height: 42, paddingTop: 9, borderRadius: 21, overflow: 'hidden', textAlign: 'center', backgroundColor: '#EAF5EB', color: '#4C7657' },
  emptyTitle: { fontSize: 13, fontWeight: '800', marginTop: 12 },
  emptyText: { fontSize: 10, color: '#7A8881', marginTop: 4 },
  auditNote: { padding: 16, marginTop: 14, borderRadius: 13, backgroundColor: '#E9F0E6' },
  auditTitle: { color: '#3A5146', fontSize: 11, fontWeight: '800', marginBottom: 5 },
  auditText: { color: '#67766F', fontSize: 10, lineHeight: 15 },
});
