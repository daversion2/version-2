import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/theme';

/**
 * Several ways to show the same thing, swiped between sideways, with dots
 * underneath (tap one to jump; VoiceOver reads them as tabs). The last view
 * seen is remembered on this phone under `storageKey`. Each page keeps its
 * own height, and the pager takes the height of the page showing.
 *
 * Today's week card and apps card both use it (2026-11-22). Don't put a
 * sideways-scrolling list inside a page: the two swipes fight.
 */
export const SwipeViews: React.FC<{
  views: { id: string; label: string; render: () => React.ReactNode }[];
  /** AsyncStorage key for the last view seen. */
  storageKey: string;
  /** What the whole pager is, for VoiceOver: "This week", "Your apps". */
  name: string;
}> = ({ views, storageKey, name }) => {
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  const restored = useRef(false);

  // Come back to the view last seen on this phone.
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((v) => {
        const i = views.findIndex((x) => x.id === v);
        if (i > 0) setPage(i);
      })
      .catch(() => {});
    // Read once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Once the width is known, show the remembered page without animating.
  useEffect(() => {
    if (width > 0 && !restored.current) {
      restored.current = true;
      scroller.current?.scrollTo({ x: page * width, animated: false });
    }
  }, [width, page]);

  const remember = (i: number) => {
    AsyncStorage.setItem(storageKey, views[i].id).catch(() => {});
  };

  const goTo = (i: number) => {
    setPage(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
    remember(i);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.max(0, Math.min(views.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (i !== page) {
      setPage(i);
      remember(i);
    }
  };

  const measure = (i: number) => (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setHeights((hs) => (hs[i] === h ? hs : Object.assign([...hs], { [i]: h })));
  };

  const height = heights[page];

  return (
    <View>
      <View onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
        {width > 0 && (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={height ? { height } : undefined}
            contentContainerStyle={styles.pages}
            accessibilityLabel={`${name}, ${views[page]?.label ?? ''} view`}
          >
            {views.map((v, i) => (
              <View key={v.id} style={{ width }} onLayout={measure(i)}>
                {v.render()}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={styles.dots} accessibilityRole="tablist">
        {views.map((v, i) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => goTo(i)}
            style={styles.dotHit}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === page }}
            accessibilityLabel={`${v.label} view`}
          >
            <View style={[styles.dot, i === page && styles.dotOn]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pages: { alignItems: 'flex-start' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dotHit: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.separator },
  dotOn: { backgroundColor: Colors.dark },
});
