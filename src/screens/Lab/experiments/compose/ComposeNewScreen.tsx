import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { Slider } from '../../../../components/common/Slider';
import { ComposeStackParamList } from '../../../../types/compose';
import { useAuth } from '../../../../context/AuthContext';
import { createComposeSession } from '../../../../services/labCompose';
import { showAlert } from '../../../../utils/alert';
import {
  COMPOSE_DEFAULT_MINUTES,
  COMPOSE_KINDS,
  COMPOSE_MAX_MINUTES,
  COMPOSE_MAX_REQUEST_CHARS,
  COMPOSE_MIN_MINUTES,
  validateComposeRequest,
  type ComposeKind,
  type ComposeRequest,
} from '../../../../utils/meditation/compose';
import { COMPOSE_BACKGROUNDS, COMPOSE_KNOWN, COMPOSE_VOICES } from '../../../../data/composeCatalog';
import { BACKGROUND_SAMPLES, VOICE_SAMPLES } from './components/sampleAssets';
import { useSamplePlayer } from './components/useSamplePlayer';
import { COMPOSE_ACCENT, cs } from './components/composeStyle';

type Props = NativeStackScreenProps<ComposeStackParamList, 'ComposeNew'>;

const PLACEHOLDER: Record<ComposeKind, string> = {
  meditation: 'e.g. Something to calm down in the ten minutes before a big presentation',
  imagery: 'e.g. My first half marathon on Sunday: the start line, the hard stretch at mile 10, finishing strong',
};

const IDEAS: Record<ComposeKind, string[]> = {
  meditation: [
    'Calm my nerves before a big presentation',
    'Let go of the workday before dinner',
    'Settle my mind so I can fall asleep',
  ],
  imagery: [
    'The last mile of my first marathon',
    'Walking into a job interview feeling ready',
    'A hard conversation going calmly and well',
  ],
};

export const ComposeNewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const prefill = route.params?.prefill;
  const [kind, setKind] = useState<ComposeKind>(prefill?.kind ?? 'meditation');
  const [request, setRequest] = useState(prefill?.request ?? '');
  const [minutes, setMinutes] = useState(prefill?.minutes ?? COMPOSE_DEFAULT_MINUTES);
  const [voice, setVoice] = useState(prefill?.voice ?? COMPOSE_VOICES[0].key);
  const [ambience, setAmbience] = useState<string | null>(prefill?.ambience === undefined ? 'rain' : prefill.ambience);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const samples = useSamplePlayer();

  const req: ComposeRequest = { request, kind, minutes, voice, ambience };
  const problem = validateComposeRequest(req, COMPOSE_KNOWN);

  // Choosing a background plays its preview; tapping it again while it plays stops it.
  const pickBackground = (key: string | null) => {
    if (key === null) samples.stop();
    else samples.toggle(`bg:${key}`, BACKGROUND_SAMPLES[key]);
    setAmbience(key);
  };

  const create = () => {
    if (!user || problem || sending) return;
    samples.stop();
    setSending(true);
    setError(null);
    try {
      const { id, written } = createComposeSession(user.uid, req, COMPOSE_KNOWN);
      // The session screen shows it straight from the local cache; if the
      // server turns the write down, the session disappears and this explains.
      written.catch(() =>
        showAlert('Couldn’t start that session', 'Check your connection and try again.'),
      );
      navigation.replace('ComposeSession', { id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t start that. Try again.');
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={cs.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.sectionLabel}>What kind</Text>
        <View style={styles.kindRow}>
          {COMPOSE_KINDS.map((k) => (
            <TouchableOpacity
              key={k.key}
              style={[cs.card, styles.kindCard, kind === k.key && cs.cardActive]}
              onPress={() => setKind(k.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: kind === k.key }}
            >
              <Ionicons name={k.key === 'imagery' ? 'eye-outline' : 'leaf-outline'} size={22} color={COMPOSE_ACCENT} />
              <Text style={cs.title}>{k.label}</Text>
              <Text style={cs.muted}>{k.blurb}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={cs.sectionLabel}>{kind === 'imagery' ? 'What do you want to rehearse?' : 'What do you need?'}</Text>
        <TextInput
          style={[cs.input, styles.request]}
          value={request}
          onChangeText={(t) => setRequest(t.slice(0, COMPOSE_MAX_REQUEST_CHARS))}
          placeholder={PLACEHOLDER[kind]}
          placeholderTextColor={Colors.gray}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Describe your session"
        />
        <View style={styles.requestFoot}>
          <Text style={cs.muted}>The more specific, the more it’ll feel like yours.</Text>
          <Text style={cs.muted}>
            {request.length}/{COMPOSE_MAX_REQUEST_CHARS}
          </Text>
        </View>
        {request.trim().length === 0 && (
          <View style={cs.chipRow}>
            {IDEAS[kind].map((idea) => (
              <TouchableOpacity key={idea} style={cs.chip} onPress={() => setRequest(idea)}>
                <Text style={cs.chipText}>{idea}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.lengthHead}>
          <Text style={cs.sectionLabel}>Length</Text>
          <Text style={styles.lengthValue}>{minutes} min</Text>
        </View>
        <Slider value={minutes} min={COMPOSE_MIN_MINUTES} max={COMPOSE_MAX_MINUTES} step={1} onChange={setMinutes} color={COMPOSE_ACCENT} />

        <Text style={cs.sectionLabel}>Voice</Text>
        {COMPOSE_VOICES.map((v) => {
          const playing = samples.playingKey === `voice:${v.key}`;
          // The sample button sits beside the selectable area, not inside it,
          // so VoiceOver can reach both.
          return (
            <View key={v.key} style={[cs.card, styles.voiceRow, voice === v.key && cs.cardActive]}>
              <TouchableOpacity
                style={styles.voiceText}
                onPress={() => setVoice(v.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: voice === v.key }}
                accessibilityLabel={`${v.name}. ${v.blurb}`}
              >
                <Text style={cs.title}>{v.name}</Text>
                <Text style={cs.muted}>{v.blurb}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => samples.toggle(`voice:${v.key}`, VOICE_SAMPLES[v.key])}
                style={styles.sampleBtn}
                accessibilityLabel={playing ? `Stop ${v.name}'s sample` : `Hear ${v.name}`}
                hitSlop={8}
              >
                <Ionicons name={playing ? 'stop-circle' : 'play-circle'} size={34} color={COMPOSE_ACCENT} />
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={cs.sectionLabel}>Background</Text>
        <View style={cs.chipRow}>
          <TouchableOpacity
            style={[cs.chip, ambience === null && cs.chipActive]}
            onPress={() => pickBackground(null)}
            accessibilityRole="radio"
            accessibilityState={{ selected: ambience === null }}
          >
            <Text style={[cs.chipText, ambience === null && cs.chipTextActive]}>None</Text>
          </TouchableOpacity>
          {COMPOSE_BACKGROUNDS.map((b) => {
            const active = ambience === b.key;
            const playing = samples.playingKey === `bg:${b.key}`;
            return (
              <TouchableOpacity
                key={b.key}
                style={[cs.chip, active && cs.chipActive]}
                onPress={() => pickBackground(b.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={(playing ? 'volume-high' : b.icon) as never} size={14} color={active ? Colors.white : Colors.dark} />
                <Text style={[cs.chipText, active && cs.chipTextActive]}>{b.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={cs.muted}>Tap one to hear it. It plays quietly under the voice.</Text>

        {error && <Text style={cs.dangerText}>{error}</Text>}
        <TouchableOpacity
          style={[cs.primaryBtn, styles.create, (problem || sending) && cs.disabled]}
          onPress={create}
          disabled={!!problem || sending}
          accessibilityRole="button"
        >
          {sending ? <ActivityIndicator color={Colors.white} /> : <Text style={cs.primaryBtnText}>Create session</Text>}
        </TouchableOpacity>
        {problem && request.trim().length > 0 && <Text style={[cs.muted, styles.center]}>{problem}</Text>}
        <Text style={[cs.muted, styles.center]}>Takes a minute or two. You can leave while it’s made.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kindRow: { flexDirection: 'row', gap: Spacing.sm },
  kindCard: { flex: 1, gap: 4 },
  request: { minHeight: 110, paddingTop: 12, lineHeight: 20 },
  requestFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginTop: -4 },
  lengthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  lengthValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: COMPOSE_ACCENT },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  voiceText: { flex: 1, gap: 2 },
  sampleBtn: { borderRadius: BorderRadius.full },
  create: { marginTop: Spacing.md },
  center: { textAlign: 'center' },
});
