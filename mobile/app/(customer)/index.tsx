/**
 * app/(customer)/index.tsx — Worker discovery screen.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_WORKERS, MOCK_SKILLS } from "../../data/mockData";
import { WorkerCard } from "../../components/shared/WorkerCard";
import { TextInput } from "../../components/ui/TextInput";
import { EmptyState } from "../../components/ui/EmptyState";
import type { WorkerProfile } from "../../types/domain";

const ALL_SKILLS = ["All", ...MOCK_SKILLS.map((s) => s.name)];

export default function DiscoverScreen() {
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);

  const filtered = MOCK_WORKERS.filter((w) => {
    const matchesSearch =
      !search ||
      w.user.name.toLowerCase().includes(search.toLowerCase()) ||
      w.city.toLowerCase().includes(search.toLowerCase()) ||
      w.skills.some((s) => s.skill.name.toLowerCase().includes(search.toLowerCase()));

    const matchesSkill =
      selectedSkill === "All" || w.skills.some((s) => s.skill.name === selectedSkill);

    const matchesAvail = !availableOnly || w.availabilityStatus === "available";

    return matchesSearch && matchesSkill && matchesAvail;
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchSection}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, skill, or city…"
          containerStyle={styles.searchInput}
        />

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skillChips}
        >
          {ALL_SKILLS.slice(0, 8).map((skill) => (
            <Pressable
              key={skill}
              style={[styles.chip, selectedSkill === skill && styles.chipActive]}
              onPress={() => setSelectedSkill(skill)}
            >
              <Text style={[styles.chipLabel, selectedSkill === skill && styles.chipLabelActive]}>
                {skill}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, availableOnly && styles.chipTeal]}
            onPress={() => setAvailableOnly(!availableOnly)}
          >
            <Text style={[styles.chipLabel, availableOnly && styles.chipLabelTeal]}>
              ✓ Available now
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Results count */}
      <Text style={styles.resultsCount}>
        {filtered.length} professional{filtered.length !== 1 ? "s" : ""} found
      </Text>

      {/* Worker list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title="No professionals found"
            description="Try adjusting your search or removing filters."
            actionLabel="Clear Filters"
            onAction={() => { setSearch(""); setSelectedSkill("All"); setAvailableOnly(false); }}
          />
        }
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onPress={() => router.push({ pathname: "/(customer)/worker-detail", params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchSection: {
    backgroundColor: Colors.backgroundCard,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  searchInput: {
    marginHorizontal: Spacing.base,
  },
  skillChips: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipTeal: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipLabelActive: { color: Colors.white },
  chipLabelTeal: { color: Colors.white },
  resultsCount: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
});
