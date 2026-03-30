import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { DailyReflection, ReflectionStats, JournalSearchResult } from '../../types';
import { getReflections, getReflectionStats, searchJournalEntries } from '../../services/reflections';
import { GradeLineChart } from '../../components/progress/GradeLineChart';
import { GradeDistributionChart } from '../../components/progress/GradeDistributionChart';
import { GRADE_COLORS } from '../../components/home/GradeSelector';

const TIME_FILTERS = ['7 Days', '30 Days', '90 Days', 'All Time'] as const;
const SOURCE_FILTERS = ['All', 'Reflections', 'Challenges'] as const;
type SourceFilter = (typeof SOURCE_FILTERS)[number];

export const ReflectionDetailScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [filter, setFilter] = useState<(typeof TIME_FILTERS)[number]>('30 Days');
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [allReflections, setAllReflections] = useState<DailyReflection[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JournalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchActive = searchQuery.trim().length > 0;

  const getStartDate = (f: string): string | undefined => {
    const d = new Date();
    if (f === '7 Days') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (f === '30 Days') {
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
    if (f === '90 Days') {
      d.setDate(d.getDate() - 90);
      return d.toISOString().split('T')[0];
    }
    return undefined;
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const start = getStartDate(filter);

    const [statsData, filtered, all] = await Promise.all([
      getReflectionStats(user.uid, start),
      getReflections(user.uid, start),
      getReflections(user.uid),
    ]);

    setStats(statsData);
    setReflections(filtered);
    setAllReflections(all);

    // Build calendar marks from all reflections
    const marks: Record<string, any> = {};
    all.forEach(r => {
      marks[r.date] = {
        marked: true,
        dotColor: GRADE_COLORS[r.grade],
        selectedColor: GRADE_COLORS[r.grade],
      };
    });
    setMarkedDates(marks);
  }, [user, filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      if (!user) return;
      try {
        const results = await searchJournalEntries(user.uid, q, allReflections);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, user, allReflections]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSourceFilter('All');
  };

  const onDayPress = (day: DateData) => {
    const reflection = allReflections.find(r => r.date === day.dateString);
    if (reflection) {
      navigation.navigate('ReflectionEntry', { reflection });
    }
  };

  const filteredResults = sourceFilter === 'All'
    ? searchResults
    : searchResults.filter(r =>
        sourceFilter === 'Reflections' ? r.source === 'reflection' : r.source === 'challenge'
      );

  const handleResultPress = (result: JournalSearchResult) => {
    if (result.source === 'reflection') {
      const reflection = allReflections.find(r => r.id === result.id);
      if (reflection) {
        navigation.navigate('ReflectionEntry', { reflection });
      }
    } else {
      navigation.navigate('ChallengeDetail', { challengeId: result.id });
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your journal..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.gray}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {isSearchActive ? (
        <>
          {/* Source Filter Chips */}
          <View style={styles.sourceFilterRow}>
            {SOURCE_FILTERS.map((sf) => (
              <TouchableOpacity
                key={sf}
                onPress={() => setSourceFilter(sf)}
                style={[styles.sourceChip, sourceFilter === sf && styles.sourceChipActive]}
              >
                <Text style={[styles.sourceChipText, sourceFilter === sf && styles.sourceChipTextActive]}>
                  {sf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Results */}
          {isSearching ? (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : filteredResults.length === 0 ? (
            <View style={styles.emptySearchContainer}>
              <Ionicons name="search-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptySearchTitle}>No matches found</Text>
              <Text style={styles.emptySearchDesc}>
                Try different keywords or check your spelling
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "{searchQuery.trim()}"
              </Text>
              {filteredResults.map((result) => (
                <Card
                  key={`${result.source}-${result.id}`}
                  style={styles.entryCard}
                  onPress={() => handleResultPress(result)}
                >
                  <View style={styles.resultHeader}>
                    <View style={styles.resultMeta}>
                      <View style={[
                        styles.sourceBadge,
                        { backgroundColor: result.source === 'reflection' ? Colors.primary : Colors.secondary },
                      ]}>
                        <Text style={styles.sourceBadgeText}>
                          {result.source === 'reflection' ? 'Reflection' : 'Challenge'}
                        </Text>
                      </View>
                      <Text style={styles.entryDate}>{formatDate(result.date)}</Text>
                    </View>
                    {result.grade && (
                      <View style={[styles.entryGrade, { backgroundColor: GRADE_COLORS[result.grade] }]}>
                        <Text style={styles.entryGradeText}>{result.grade}</Text>
                      </View>
                    )}
                    {result.difficulty && !result.grade && (
                      <View style={[styles.entryGrade, { backgroundColor: Colors.primary }]}>
                        <Text style={styles.entryGradeText}>{result.difficulty}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.resultContext} numberOfLines={1}>
                    {result.contextLabel}
                  </Text>
                  <Text style={styles.resultField}>{result.matchedField}</Text>
                  <Text style={styles.resultPreview} numberOfLines={2}>
                    {result.matchedText}
                  </Text>
                </Card>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          {/* Time Filter */}
          <View style={styles.filterRow}>
            {TIME_FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, filter === f && styles.filterActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats Row */}
          {stats && (
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalReflections}</Text>
                <Text style={styles.statLabel}>Reflections</Text>
              </Card>
              <Card style={styles.statCard}>
                {stats.totalReflections > 0 ? (
                  <View style={[styles.miniGrade, { backgroundColor: GRADE_COLORS[stats.averageGradeLetter] }]}>
                    <Text style={styles.miniGradeText}>{stats.averageGradeLetter}</Text>
                  </View>
                ) : (
                  <Text style={styles.statValue}>-</Text>
                )}
                <Text style={styles.statLabel}>Avg Grade</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{stats.currentStreak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{stats.longestStreak}</Text>
                <Text style={styles.statLabel}>Best</Text>
              </Card>
            </View>
          )}

          {/* Grade Distribution */}
          {stats && <GradeDistributionChart distribution={stats.gradeDistribution} />}

          {/* Grade Trend */}
          <GradeLineChart reflections={reflections} />

          {/* Calendar */}
          <Text style={styles.sectionTitle}>Reflection Calendar</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={onDayPress}
            theme={{
              todayTextColor: Colors.secondary,
              arrowColor: Colors.primary,
              textDayFontFamily: Fonts.secondary,
              textMonthFontFamily: Fonts.primaryBold,
              textDayHeaderFontFamily: Fonts.secondary,
            }}
            style={styles.calendar}
          />

          {/* Recent Entries */}
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {reflections.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No reflections for this period</Text>
            </Card>
          ) : (
            reflections.slice(0, 20).map((r) => (
              <Card
                key={r.date}
                style={styles.entryCard}
                onPress={() => navigation.navigate('ReflectionEntry', { reflection: r })}
              >
                <View style={styles.entryRow}>
                  <View style={[styles.entryGrade, { backgroundColor: GRADE_COLORS[r.grade] }]}>
                    <Text style={styles.entryGradeText}>{r.grade}</Text>
                  </View>
                  <View style={styles.entryContent}>
                    <Text style={styles.entryDate}>
                      {formatDate(r.date)}
                    </Text>
                    {r.prompt_went_well && (
                      <Text style={styles.entryPreview} numberOfLines={1}>
                        {r.prompt_went_well}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  // Source filter chips
  sourceFilterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sourceChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sourceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sourceChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  sourceChipTextActive: {
    color: Colors.white,
    fontFamily: Fonts.secondaryBold,
  },
  // Search results
  searchingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  resultCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sourceBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.white,
  },
  resultContext: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: 2,
  },
  resultField: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  resultPreview: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  // Empty search state
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptySearchTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  emptySearchDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  // Time filters
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  filterActiveText: { color: Colors.white },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  miniGrade: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  calendar: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  // Entries
  entryCard: {
    marginBottom: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  entryGrade: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryGradeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  entryContent: {
    flex: 1,
  },
  entryDate: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  entryPreview: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
});
