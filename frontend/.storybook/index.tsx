import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { stories } from './storybook.requires';
import { TripProvider } from '../src/context/TripContext';

/**
 * StorybookUIRoot - Interactive Storybook UI viewer component
 * Can be rendered directly in web or mobile app development screens.
 */
export const StorybookUIRoot: React.FC = () => {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const activeStoryGroup = stories[selectedStoryIndex] || stories[0];
  const Component = activeStoryGroup.module.default.component;
  const defaultArgs = activeStoryGroup.module.default.args || {};

  // Extract exported stories from module
  const storyEntries = Object.entries(activeStoryGroup.module).filter(
    ([key]) => key !== 'default'
  );

  return (
    <TripProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>VoyageRail Storybook UI</Text>
          <Text style={styles.subtitle}>{activeStoryGroup.name}</Text>
        </View>

        {/* Story Selector Tabs */}
        <View style={styles.navBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
            {stories.map((s, index) => {
              const isSelected = index === selectedStoryIndex;
              return (
                <TouchableOpacity
                  key={s.name}
                  style={[styles.tab, isSelected && styles.tabSelected]}
                  onPress={() => setSelectedStoryIndex(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select story ${s.name}`}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Stories Canvas */}
        <ScrollView style={styles.canvas} contentContainerStyle={styles.canvasContent}>
          {storyEntries.length > 0 ? (
            storyEntries.map(([storyKey, storyObj]) => {
              const castStory = storyObj as { args?: Record<string, unknown> };
              const mergedArgs = { ...defaultArgs, ...(castStory.args || {}) };
              return (
                <View key={storyKey} style={styles.storyCard}>
                  <Text style={styles.storyName}>{storyKey}</Text>
                  <View style={styles.storyPreview}>
                    <Component {...mergedArgs} />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.storyCard}>
              <Text style={styles.storyName}>Default</Text>
              <View style={styles.storyPreview}>
                <Component {...defaultArgs} />
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </TripProvider>
  );
};

export default StorybookUIRoot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  navBar: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
  },
  navScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  tabSelected: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  tabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  canvasContent: {
    padding: 16,
    gap: 16,
  },
  storyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  storyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  storyPreview: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
});
