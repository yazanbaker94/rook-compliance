import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { syncQueuedSubmissions } from './src/api';
import { initializeDatabase, listAssignments, listSubmissions, saveSubmission } from './src/storage';
import { fonts, palette, radii } from './src/theme';
import type { Assignment, LocationPoint, QueuedSubmission } from './src/types';

const paperTexture = require('./assets/brand/paper-texture.png');
const birdLogo = require('./assets/brand/rook-bird.png');
const industrialSilhouette = require('./assets/brand/industrial-silhouette.png');

type Screen = 'home' | 'capture' | 'queue';
type SaveDestination = 'home' | 'queue';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
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
    initializeDatabase()
      .then(refresh)
      .catch((error) => Alert.alert('Database error', String(error)))
      .finally(() => setLoading(false));
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

  async function finishSave(destination: SaveDestination) {
    await refresh();
    setScreen(destination);
  }

  if ((!fontsLoaded && !fontError) || loading) return <BrandedLoading />;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ImageBackground source={paperTexture} resizeMode="repeat" style={styles.paperBackground} imageStyle={styles.paperTexture}>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="dark" />
          <Header isOnline={isOnline} backLabel={screen === 'home' ? undefined : 'Assignments'} onBack={() => setScreen('home')} />
          {screen === 'home' && (
            <Home assignments={assignments} queuedCount={queuedCount} isOnline={isOnline} onOpen={openAssignment} onQueue={() => setScreen('queue')} />
          )}
          {screen === 'capture' && selected && <Capture assignment={selected} onSaved={finishSave} />}
          {screen === 'queue' && (
            <Queue submissions={submissions} queuedCount={queuedCount} syncing={syncing} isOnline={Boolean(isOnline)} onSync={syncNow} />
          )}
        </SafeAreaView>
      </ImageBackground>
    </SafeAreaProvider>
  );
}

function BrandedLoading() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ImageBackground source={paperTexture} resizeMode="cover" style={styles.loading}>
        <StatusBar style="dark" />
        <View style={styles.loadingBrand}>
          <Image source={birdLogo} style={styles.loadingBird} resizeMode="contain" />
          <Text style={styles.loadingWordmark}>ROOK FIELD</Text>
          <View style={styles.limeRule} />
        </View>
        <Text style={styles.loadingTitle}>Preparing offline workspace</Text>
        <Text style={styles.loadingMeta}>Loading assignments · restoring local records</Text>
        <ActivityIndicator color={palette.forest} style={styles.loadingSpinner} />
        <Image source={industrialSilhouette} style={styles.loadingLandscape} resizeMode="cover" />
      </ImageBackground>
    </SafeAreaProvider>
  );
}

function Header({ isOnline, backLabel, onBack }: { isOnline: boolean | null; backLabel?: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      {backLabel ? (
        <Pressable onPress={onBack} style={styles.headerBack} hitSlop={10}>
          <Text style={styles.headerBackArrow}>←</Text><Text style={styles.headerBackText}>{backLabel}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onBack} style={styles.brand} hitSlop={8}>
          <Image source={birdLogo} style={styles.brandBird} resizeMode="contain" /><Text style={styles.brandName}>Rook Field</Text>
        </Pressable>
      )}
      <ConnectionStamp isOnline={isOnline} />
    </View>
  );
}

function ConnectionStamp({ isOnline }: { isOnline: boolean | null }) {
  const offline = isOnline === false;
  return (
    <View style={[styles.connectionStamp, offline && styles.connectionOffline]}>
      <View style={[styles.connectionDot, offline && styles.connectionDotOffline]} />
      <Text style={[styles.connectionText, offline && styles.connectionTextOffline]}>{isOnline === null ? 'CHECKING' : isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
    </View>
  );
}

function Home({ assignments, queuedCount, isOnline, onOpen, onQueue }: {
  assignments: Assignment[];
  queuedCount: number;
  isOnline: boolean | null;
  onOpen: (item: Assignment) => void;
  onQueue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>TUESDAY · AUGUST 25</Text>
        <Text style={styles.title}>{isOnline === false ? 'Work offline.' : 'Your field work.'}</Text>
        <Text style={styles.subtitle}>{isOnline === false ? "You’re offline. No problem—keep working. We’ll sync when you’re back online." : 'Assignments are cached on this device, so you can keep working outside coverage.'}</Text>
      </View>
      {queuedCount > 0 && (
        <Pressable style={styles.syncBanner} onPress={onQueue}>
          <View><Text style={styles.syncBannerLabel}>{isOnline === false ? 'WORKING LOCALLY' : 'READY TO SYNC'}</Text><Text style={styles.syncBannerTitle}>{queuedCount} field record{queuedCount === 1 ? '' : 's'} waiting</Text></View>
          <Text style={styles.syncArrow}>→</Text>
        </Pressable>
      )}
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Assigned to you</Text><Text style={styles.count}>{assignments.length}</Text></View>
      {assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} onOpen={() => onOpen(assignment)} />)}
      <View style={styles.offlineNote}>
        <View style={styles.offlineIconBox}><Text style={styles.offlineIcon}>ϟ</Text></View>
        <View style={styles.offlineNoteBody}>
          <Text style={styles.offlineTitle}>OFFLINE WORKSPACE</Text>
          <Text style={styles.offlineText}>Assignments and evidence are stored locally on this device.</Text>
          <Text style={styles.offlineMeta}>SQLite ready · Local records restored</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function AssignmentCard({ assignment, onOpen }: { assignment: Assignment; onOpen: () => void }) {
  const riskStyle = assignment.risk === 'HIGH' ? styles.highRisk : assignment.risk === 'LOW' ? styles.lowRisk : styles.mediumRisk;
  return (
    <Pressable style={({ pressed }) => [styles.assignment, pressed && styles.assignmentPressed]} onPress={onOpen}>
      <View style={styles.assignmentTop}><Text style={[styles.riskStamp, riskStyle]}>{assignment.risk} PRIORITY</Text><Text style={styles.due}>{assignment.dueLabel}</Text></View>
      <Text style={styles.assignmentFacility}>{assignment.facility}</Text><Text style={styles.assignmentTitle}>{assignment.title}</Text>
      <View style={styles.evidenceRow}><Text style={styles.evidenceIcon}>⊙</Text><Text style={styles.evidence}>{assignment.evidenceRequired}</Text></View>
      <View style={styles.openRow}><Text style={styles.openLabel}>OPEN ASSIGNMENT</Text><Text style={styles.openArrow}>→</Text></View>
    </Pressable>
  );
}

function Capture({ assignment, onSaved }: { assignment: Assignment; onSaved: (destination: SaveDestination) => Promise<void> }) {
  const [checked, setChecked] = useState([false, false, false]);
  const [reading, setReading] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
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
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
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
      setSaved(true);
      setSavedModalVisible(true);
    } catch (error) {
      Alert.alert('Could not save', String(error));
    } finally {
      setSaving(false);
    }
  }

  async function closeSavedModal(destination: SaveDestination) {
    setSavedModalVisible(false);
    await onSaved(destination);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.captureHeading}>
          <Text style={styles.eyebrow}>{assignment.facility}</Text><Text style={styles.captureTitle}>{assignment.title}</Text><Text style={styles.captureMeta}>{assignment.dueLabel} · {inspectionType}</Text><View style={styles.headerRule} />
        </View>
        <FieldSection number="01" title="CHECKLIST">
          {checklist.map((label, index) => (
            <Pressable key={label} style={styles.checkRow} onPress={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))}>
              <View style={[styles.checkbox, checked[index] && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{checked[index] ? '✓' : ''}</Text></View><Text style={styles.checkLabel}>{label}</Text>
            </Pressable>
          ))}
        </FieldSection>
        <FieldSection number="02" title="READING">
          <Text style={styles.inputLabel}>{readingLabel}</Text>
          <TextInput value={reading} onChangeText={setReading} placeholder={readingPlaceholder} placeholderTextColor="#8C9892" style={styles.input} />
          <Text style={styles.inputLabel}>Field notes</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline textAlignVertical="top" placeholder="Exceptions, maintenance needs, or context…" placeholderTextColor="#8C9892" style={[styles.input, styles.notesInput]} />
        </FieldSection>
        <FieldSection number="03" title="EVIDENCE">
          {photos.length > 0 && (
            <View style={styles.photoGrid}>{photos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.photoFrame}><Image source={{ uri }} style={styles.evidencePhoto} /><View style={styles.photoIndex}><Text style={styles.photoIndexText}>{index + 1}</Text></View></View>)}</View>
          )}
          <View style={styles.evidenceButtons}>
            <Pressable style={styles.evidenceButton} onPress={capturePhoto}><Text style={styles.evidenceButtonIcon}>▣</Text><Text style={styles.evidenceButtonTitle}>{photos.length ? 'Add photo' : 'Take photo'}</Text><Text style={styles.evidenceButtonMeta}>{photos.length ? `${photos.length} attached` : 'Camera evidence'}</Text></Pressable>
            <Pressable style={styles.evidenceButton} onPress={captureLocation}><Text style={styles.evidenceButtonIcon}>⌖</Text><Text style={styles.evidenceButtonTitle}>{locating ? 'Locating…' : 'Add location'}</Text><Text style={styles.evidenceButtonMeta}>{location ? 'GPS captured' : 'Optional GPS tag'}</Text></Pressable>
          </View>
          {location && <View style={styles.locationRecord}><Text style={styles.locationLabel}>LOCATION</Text><Text style={styles.locationValue}>{location.latitude.toFixed(5)}° N · {Math.abs(location.longitude).toFixed(5)}° {location.longitude < 0 ? 'W' : 'E'}</Text></View>}
        </FieldSection>
        <Pressable disabled={saving || saved} style={[styles.primaryButton, (saving || saved) && styles.primaryButtonDisabled]} onPress={save}>
          {saving ? <ActivityIndicator color={palette.white} /> : <><Text style={styles.primaryButtonText}>{saved ? 'SAVED LOCALLY' : 'SAVE INSPECTION OFFLINE'}</Text><Text style={styles.primaryButtonArrow}>{saved ? '✓' : '→'}</Text></>}
        </Pressable>
      </ScrollView>
      <SavedModal visible={savedModalVisible} onViewQueue={() => { void closeSavedModal('queue'); }} onDone={() => { void closeSavedModal('home'); }} onRequestClose={() => { void closeSavedModal('home'); }} />
    </KeyboardAvoidingView>
  );
}

function FieldSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <View style={styles.formCard}><Text style={styles.formStep}>{number} · {title}</Text>{children}</View>;
}

function SavedModal({ visible, onViewQueue, onDone, onRequestClose }: { visible: boolean; onViewQueue: () => void; onDone: () => void; onRequestClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
      <View style={styles.modalBackdrop}>
        <ImageBackground source={paperTexture} resizeMode="cover" style={styles.savedModal} imageStyle={styles.savedModalTexture}>
          <View style={styles.successMark}><Text style={styles.successMarkText}>✓</Text></View>
          <Text style={styles.savedEyebrow}>OFFLINE RECORD SAVED</Text><Text style={styles.savedTitle}>Safe on this device.</Text><Text style={styles.savedText}>This inspection is stored locally and will sync when connectivity is available.</Text>
          <Pressable style={styles.modalPrimary} onPress={onViewQueue}><Text style={styles.modalPrimaryText}>VIEW SYNC QUEUE</Text></Pressable>
          <Pressable style={styles.modalSecondary} onPress={onDone}><Text style={styles.modalSecondaryText}>DONE</Text></Pressable>
        </ImageBackground>
      </View>
    </Modal>
  );
}

function Queue({ submissions, queuedCount, syncing, isOnline, onSync }: { submissions: QueuedSubmission[]; queuedCount: number; syncing: boolean; isOnline: boolean; onSync: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.queueHeading}><Text style={styles.eyebrow}>OFFLINE-FIRST DELIVERY</Text><Text style={styles.title}>Sync queue.</Text><Text style={styles.subtitle}>{queuedCount ? 'Your work is stored locally until the server confirms receipt.' : 'Every field record has reached the office console.'}</Text></View>
      {queuedCount > 0 ? (
        <Pressable disabled={syncing} style={[styles.queueAction, syncing && styles.primaryButtonDisabled]} onPress={onSync}>
          {syncing ? <ActivityIndicator color={palette.white} /> : <><View><Text style={styles.queueActionLabel}>{isOnline ? 'SYNC PENDING RECORDS' : 'OFFLINE · RECORDS ARE SAFE'}</Text><Text style={styles.queueActionCount}>{queuedCount}</Text></View><Text style={styles.queueActionIcon}>{isOnline ? '↥' : '⌁'}</Text></>}
        </Pressable>
      ) : (
        <View style={styles.emptyQueue}><View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✓</Text></View><Text style={styles.emptyTitle}>All caught up.</Text><Text style={styles.emptyText}>No records waiting to sync.</Text></View>
      )}
      {submissions.length > 0 && (
        <View style={styles.queueList}>{submissions.map((item) => <View style={styles.queueItem} key={item.localId}><View style={[styles.queueState, item.syncState === 'SYNCED' && styles.queueSynced]}><Text style={styles.queueStateText}>{item.syncState === 'SYNCED' ? '✓' : '↑'}</Text></View><View style={styles.queueBody}><Text style={styles.queueTitle}>{item.reading}</Text><Text style={styles.queueMeta}>{new Date(item.completedAt).toLocaleString()} · {item.photoUris.length} photo{item.photoUris.length === 1 ? '' : 's'}</Text></View><Text style={[styles.statusStamp, item.syncState === 'SYNCED' ? styles.syncedStamp : styles.queuedStamp]}>{item.syncState}</Text></View>)}</View>
      )}
      <View style={styles.auditNote}><View style={styles.auditIcon}><Text style={styles.auditIconText}>◈</Text></View><View style={styles.auditBody}><Text style={styles.auditTitle}>{queuedCount ? 'NO DUPLICATE SUBMISSIONS' : 'YOU’RE ONLINE'}</Text><Text style={styles.auditText}>{queuedCount ? 'Each device record has a unique local ID. The API uses it as an idempotency key, so retrying a sync is safe.' : 'New records will sync automatically in the background.'}</Text><Text style={styles.auditMeta}>{queuedCount ? 'Idempotency protection active' : 'Last sync · just now'}</Text></View></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  paperBackground: { flex: 1, backgroundColor: palette.warmIvory },
  paperTexture: { opacity: 0.72 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.warmIvory, overflow: 'hidden' },
  loadingBrand: { alignItems: 'center', marginBottom: 34, zIndex: 2 },
  loadingBird: { width: 84, height: 84, marginBottom: 13 },
  loadingWordmark: { color: palette.forestDeep, fontFamily: fonts.technicalBold, fontSize: 17, letterSpacing: 2 },
  limeRule: { width: 45, height: 3, marginTop: 15, backgroundColor: palette.acidLime },
  loadingTitle: { color: palette.ink, fontFamily: fonts.bodySemiBold, fontSize: 18, zIndex: 2 },
  loadingMeta: { maxWidth: 290, marginTop: 12, color: palette.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center', zIndex: 2 },
  loadingSpinner: { marginTop: 22, zIndex: 2 },
  loadingLandscape: { position: 'absolute', right: 0, bottom: 0, left: 0, width: '100%', height: 245, opacity: 0.18 },
  topBar: { minHeight: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.lineSoft, backgroundColor: 'rgba(248,246,240,0.82)' },
  brand: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBird: { width: 31, height: 38 },
  brandName: { color: palette.forestDark, fontFamily: fonts.bodyBold, fontSize: 19, letterSpacing: -0.5 },
  headerBack: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerBackArrow: { color: palette.forest, fontFamily: fonts.bodyMedium, fontSize: 22 },
  headerBackText: { color: palette.forestDark, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  connectionStamp: { minHeight: 29, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#BFCDBE', borderRadius: radii.stamp, backgroundColor: 'rgba(235,242,228,0.78)' },
  connectionOffline: { borderColor: '#D8AF70', backgroundColor: 'rgba(255,237,205,0.78)' },
  connectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green },
  connectionDotOffline: { backgroundColor: palette.amber },
  connectionText: { color: palette.forest, fontFamily: fonts.technicalBold, fontSize: 9, letterSpacing: 0.7 },
  connectionTextOffline: { color: '#915D14' },
  screen: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 54 },
  greeting: { marginBottom: 21 },
  eyebrow: { marginBottom: 8, color: '#53645D', fontFamily: fonts.technicalBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: palette.forestDark, fontFamily: fonts.bodyExtraBold, fontSize: 34, lineHeight: 40, letterSpacing: -1.25 },
  subtitle: { maxWidth: 390, marginTop: 8, color: '#52615B', fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  syncBanner: { minHeight: 94, marginBottom: 27, paddingHorizontal: 19, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: palette.forestDark, borderRadius: radii.panel, backgroundColor: palette.forestDeep },
  syncBannerLabel: { color: palette.acidLime, fontFamily: fonts.technicalBold, fontSize: 11, letterSpacing: 1.1 },
  syncBannerTitle: { marginTop: 5, color: palette.white, fontFamily: fonts.bodyBold, fontSize: 18 },
  syncArrow: { color: palette.acidLime, fontFamily: fonts.bodyMedium, fontSize: 25 },
  sectionHeading: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 18 },
  count: { minWidth: 29, paddingVertical: 4, paddingHorizontal: 7, overflow: 'hidden', color: palette.ink, borderRadius: radii.stamp, backgroundColor: '#E5E6DE', fontFamily: fonts.technicalBold, fontSize: 11, textAlign: 'center' },
  assignment: { marginBottom: 13, paddingHorizontal: 17, paddingTop: 16, borderWidth: 1, borderColor: '#8C9691', borderRadius: radii.panel, backgroundColor: 'rgba(251,249,243,0.78)' },
  assignmentPressed: { borderColor: palette.forest, backgroundColor: 'rgba(232,238,225,0.92)' },
  assignmentTop: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskStamp: { paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden', borderWidth: 1, borderRadius: radii.stamp, fontFamily: fonts.technicalBold, fontSize: 9, letterSpacing: 0.45 },
  highRisk: { color: '#A33E36', borderColor: '#D79590', backgroundColor: 'rgba(255,235,231,0.72)' },
  mediumRisk: { color: '#8D5C16', borderColor: '#D8A553', backgroundColor: 'rgba(255,240,211,0.75)' },
  lowRisk: { color: '#376748', borderColor: '#8EAF95', backgroundColor: 'rgba(231,241,229,0.75)' },
  due: { color: '#4B5A54', fontFamily: fonts.technicalBold, fontSize: 10, textTransform: 'uppercase' },
  assignmentFacility: { marginBottom: 6, color: '#5C6A64', fontFamily: fonts.bodyMedium, fontSize: 14 },
  assignmentTitle: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.45 },
  evidenceRow: { paddingVertical: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  evidenceIcon: { color: palette.forest, fontSize: 16 },
  evidence: { flex: 1, color: '#53625C', fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  openRow: { minHeight: 52, marginHorizontal: -17, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#AEB6B1' },
  openLabel: { color: palette.forestDark, fontFamily: fonts.technicalBold, fontSize: 11, letterSpacing: 0.45 },
  openArrow: { color: palette.forest, fontFamily: fonts.bodyMedium, fontSize: 20 },
  offlineNote: { marginTop: 9, padding: 16, flexDirection: 'row', gap: 13, borderWidth: 1, borderColor: '#C4CBAF', borderRadius: radii.panel, backgroundColor: 'rgba(235,239,215,0.62)' },
  offlineIconBox: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, backgroundColor: 'rgba(198,220,57,0.45)' },
  offlineIcon: { color: palette.forest, fontFamily: fonts.bodyBold, fontSize: 20 },
  offlineNoteBody: { flex: 1 },
  offlineTitle: { marginBottom: 5, color: palette.forestDark, fontFamily: fonts.technicalBold, fontSize: 10, letterSpacing: 0.8 },
  offlineText: { color: '#4E5C56', fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  offlineMeta: { marginTop: 9, color: '#65736D', fontFamily: fonts.technical, fontSize: 10 },
  captureHeading: { marginBottom: 21 },
  captureTitle: { color: palette.forestDark, fontFamily: fonts.bodyExtraBold, fontSize: 31, lineHeight: 36, letterSpacing: -1 },
  captureMeta: { marginTop: 9, color: '#53625C', fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  headerRule: { width: 42, height: 3, marginTop: 14, backgroundColor: palette.acidLime },
  formCard: { marginBottom: 13, paddingHorizontal: 17, paddingTop: 17, borderWidth: 1, borderColor: '#8C9691', borderRadius: radii.panel, backgroundColor: 'rgba(251,249,243,0.76)' },
  formStep: { marginBottom: 12, color: palette.forestDark, fontFamily: fonts.technicalBold, fontSize: 11, letterSpacing: 0.9 },
  checkRow: { minHeight: 68, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: '#B7BEB9' },
  checkbox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#82928A', borderRadius: 5, backgroundColor: palette.paperStrong },
  checkboxChecked: { borderColor: '#A4BC25', backgroundColor: palette.acidLime },
  checkboxMark: { color: palette.forestDark, fontFamily: fonts.bodyExtraBold, fontSize: 19, lineHeight: 22 },
  checkLabel: { flex: 1, color: '#2C3833', fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 23 },
  inputLabel: { marginTop: 2, marginBottom: 8, color: '#283630', fontFamily: fonts.bodyBold, fontSize: 14 },
  input: { minHeight: 54, marginBottom: 17, paddingHorizontal: 14, paddingVertical: 12, color: palette.ink, borderWidth: 1, borderColor: '#8D9993', borderRadius: radii.control, backgroundColor: 'rgba(248,246,240,0.78)', fontFamily: fonts.bodyMedium, fontSize: 16 },
  notesInput: { minHeight: 118, lineHeight: 23 },
  evidenceButtons: { flexDirection: 'row', gap: 10, paddingBottom: 17 },
  evidenceButton: { minHeight: 132, flex: 1, padding: 14, justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#81928A', borderRadius: radii.control, backgroundColor: 'rgba(248,246,240,0.55)' },
  evidenceButtonIcon: { marginBottom: 13, color: palette.forest, fontFamily: fonts.technicalBold, fontSize: 24 },
  evidenceButtonTitle: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 16 },
  evidenceButtonMeta: { marginTop: 5, color: '#63716B', fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  photoGrid: { marginBottom: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoFrame: { position: 'relative', width: '48.5%', aspectRatio: 0.92, overflow: 'hidden', borderWidth: 1, borderColor: palette.line, borderRadius: radii.control, backgroundColor: '#D7DED7' },
  evidencePhoto: { width: '100%', height: '100%' },
  photoIndex: { position: 'absolute', top: 8, right: 8, minWidth: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: palette.forestDeep },
  photoIndexText: { color: palette.acidLime, fontFamily: fonts.technicalBold, fontSize: 10 },
  locationRecord: { marginBottom: 17, paddingVertical: 13, paddingHorizontal: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#A5AFA9' },
  locationLabel: { marginBottom: 5, color: palette.forest, fontFamily: fonts.technicalBold, fontSize: 10, letterSpacing: 0.8 },
  locationValue: { color: palette.ink, fontFamily: fonts.technical, fontSize: 13, lineHeight: 20 },
  primaryButton: { minHeight: 60, marginTop: 4, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.forestDark, borderRadius: radii.control, backgroundColor: palette.forestDeep },
  primaryButtonDisabled: { opacity: 0.58 },
  primaryButtonText: { color: palette.white, fontFamily: fonts.technicalBold, fontSize: 12, letterSpacing: 0.55 },
  primaryButtonArrow: { color: palette.acidLime, fontFamily: fonts.bodyBold, fontSize: 22 },
  modalBackdrop: { flex: 1, paddingHorizontal: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.overlay },
  savedModal: { width: '100%', maxWidth: 430, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 18, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: palette.forestDark, borderRadius: radii.panel, backgroundColor: palette.paper },
  savedModalTexture: { opacity: 0.86 },
  successMark: { width: 55, height: 55, marginBottom: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.forest, borderRadius: 28, backgroundColor: 'rgba(198,220,57,0.20)' },
  successMarkText: { color: palette.forest, fontFamily: fonts.bodyExtraBold, fontSize: 29 },
  savedEyebrow: { marginBottom: 10, color: '#58675F', fontFamily: fonts.technicalBold, fontSize: 10, letterSpacing: 1.05 },
  savedTitle: { color: palette.forestDark, fontFamily: fonts.bodyExtraBold, fontSize: 28, letterSpacing: -0.7, textAlign: 'center' },
  savedText: { maxWidth: 300, marginTop: 12, marginBottom: 25, color: '#44534D', fontFamily: fonts.body, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  modalPrimary: { width: '100%', minHeight: 55, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, backgroundColor: palette.forestDeep },
  modalPrimaryText: { color: palette.white, fontFamily: fonts.technicalBold, fontSize: 12, letterSpacing: 0.5 },
  modalSecondary: { minHeight: 50, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryText: { color: palette.forest, fontFamily: fonts.technicalBold, fontSize: 11, letterSpacing: 0.5 },
  queueHeading: { marginBottom: 21 },
  queueAction: { minHeight: 91, marginBottom: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.forestDark, borderRadius: radii.panel, backgroundColor: palette.forestDeep },
  queueActionLabel: { color: palette.acidLime, fontFamily: fonts.technicalBold, fontSize: 11, letterSpacing: 0.7 },
  queueActionCount: { marginTop: 5, color: palette.white, fontFamily: fonts.bodyBold, fontSize: 19 },
  queueActionIcon: { color: palette.acidLime, fontFamily: fonts.bodyMedium, fontSize: 27 },
  emptyQueue: { minHeight: 250, marginBottom: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#87948D', borderRadius: radii.panel, backgroundColor: 'rgba(251,249,243,0.56)' },
  emptyMark: { width: 54, height: 54, marginBottom: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.forest, borderRadius: 27 },
  emptyMarkText: { color: palette.forest, fontFamily: fonts.bodyExtraBold, fontSize: 27 },
  emptyTitle: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 22 },
  emptyText: { marginTop: 6, color: palette.muted, fontFamily: fonts.body, fontSize: 15 },
  queueList: { marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#8C9691', borderRadius: radii.panel, backgroundColor: 'rgba(251,249,243,0.72)' },
  queueItem: { minHeight: 92, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: '#AEB7B2' },
  queueState: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, backgroundColor: '#F8E7C9' },
  queueSynced: { backgroundColor: '#E4EFE4' },
  queueStateText: { color: palette.forestDark, fontFamily: fonts.bodyExtraBold, fontSize: 21 },
  queueBody: { flex: 1 },
  queueTitle: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  queueMeta: { marginTop: 5, color: '#69766F', fontFamily: fonts.technical, fontSize: 10, lineHeight: 15 },
  statusStamp: { paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden', borderWidth: 1, borderRadius: radii.stamp, fontFamily: fonts.technicalBold, fontSize: 9, letterSpacing: 0.4 },
  queuedStamp: { color: '#986112', borderColor: '#C88B30', backgroundColor: 'rgba(255,241,214,0.64)' },
  syncedStamp: { color: '#376C49', borderColor: '#79A185', backgroundColor: 'rgba(230,241,228,0.64)' },
  auditNote: { padding: 16, flexDirection: 'row', gap: 13, borderWidth: 1, borderColor: '#C4CBAF', borderRadius: radii.panel, backgroundColor: 'rgba(235,239,215,0.62)' },
  auditIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, backgroundColor: 'rgba(198,220,57,0.45)' },
  auditIconText: { color: palette.forest, fontSize: 20 },
  auditBody: { flex: 1 },
  auditTitle: { color: palette.forestDark, fontFamily: fonts.technicalBold, fontSize: 10, letterSpacing: 0.7 },
  auditText: { marginTop: 6, color: '#4F5D57', fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  auditMeta: { marginTop: 10, color: '#68756F', fontFamily: fonts.technical, fontSize: 10 },
});
