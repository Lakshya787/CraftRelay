/**
 * app/(worker)/qualifications.tsx — Worker qualification workspace.
 *
 * Shows active assessments, criteria, and evidence submission.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_ASSESSMENTS, MOCK_QUALIFICATIONS, MOCK_EVIDENCE } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { StatusIndicator } from "../../components/shared/StatusIndicator";
import { CriterionCard } from "../../components/shared/CriterionCard";
import { EvidenceCard } from "../../components/shared/EvidenceCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProgressBar } from "../../components/ui/ProgressBar";

const TABS = ["Assessments", "Evidence"] as const;
type Tab = typeof TABS[number];

export default function QualificationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("Assessments");
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(MOCK_ASSESSMENTS[0]?.id ?? null);

  const myAssessments = MOCK_ASSESSMENTS.filter((a) => a.worker.user.id === "u1");
  const myEvidence = MOCK_EVIDENCE.filter((e) => e.workerId === "u1");

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "Assessments" ? (
        <>
          {/* Available qualifications hint */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>📋 {MOCK_QUALIFICATIONS.length} qualifications available</Text>
            <Text style={styles.infoText}>
              Apply for a qualification to start the assessment process and get your skills verified.
            </Text>
            <Button label="Browse Qualifications" variant="outline" size="sm" onPress={() => {}} />
          </Card>

          {myAssessments.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="No active assessments"
              description="Apply for a qualification to begin your skill verification journey."
              actionLabel="Browse Qualifications"
              onAction={() => {}}
            />
          ) : (
            myAssessments.map((assessment) => {
              const isExpanded = expandedAssessment === assessment.id;
              const totalScore = assessment.criterionScores.reduce((s, c) => s + c.score, 0);
              const maxPossible = assessment.criterionScores.reduce((s, c) => s + c.maxScore, 0);

              return (
                <Card key={assessment.id} padded={false} style={styles.assessmentCard}>
                  {/* Header */}
                  <Pressable
                    style={styles.assessmentHeader}
                    onPress={() => setExpandedAssessment(isExpanded ? null : assessment.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.qualTitle}>{assessment.qualification.title}</Text>
                      <Text style={styles.qualSub}>
                        {assessment.qualification.skill.name} · {assessment.qualification.level}
                      </Text>
                    </View>
                    <View style={styles.headerRight}>
                      <StatusIndicator status={assessment.status} />
                      <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                    </View>
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.assessmentBody}>
                      <Divider spacing={0} />

                      {/* Progress */}
                      {maxPossible > 0 ? (
                        <View style={styles.progressSection}>
                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Overall score</Text>
                            <Text style={styles.progressValue}>
                              {totalScore}/{maxPossible}
                            </Text>
                          </View>
                          <ProgressBar
                            value={(totalScore / maxPossible) * 100}
                            color={Colors.primary}
                          />
                        </View>
                      ) : null}

                      {/* Criteria */}
                      <View style={styles.criteriaList}>
                        <Text style={styles.criteriaHeader}>Criteria</Text>
                        {assessment.qualification.criteria.map((c) => {
                          const scored = assessment.criterionScores.find(
                            (cs) => cs.criterionId === c.id
                          );
                          return (
                            <CriterionCard
                              key={c.id}
                              criterion={c}
                              score={scored?.score}
                              maxScore={scored?.maxScore}
                              showProgress={!!scored}
                            />
                          );
                        })}
                      </View>

                      {/* Submit evidence CTA */}
                      <Button
                        label="Submit Evidence"
                        variant="primary"
                        size="md"
                        onPress={() => router.push("/(worker)/evidence-submit")}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </>
      ) : (
        /* Evidence tab */
        <>
          <Button
            label="+ Add Evidence"
            variant="primary"
            size="md"
            onPress={() => router.push("/(worker)/evidence-submit")}
            style={styles.addEvidenceBtn}
          />

          {myEvidence.length === 0 ? (
            <EmptyState
              icon="📎"
              title="No evidence submitted"
              description="Upload photos, certificates, or documents to support your qualification."
            />
          ) : (
            <View style={styles.evidenceList}>
              {myEvidence.map((e) => (
                <EvidenceCard key={e.id} evidence={e} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing["4xl"] },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.md,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.white,
  },
  infoCard: {
    backgroundColor: "#EBF2FF",
    borderColor: Colors.primary + "30",
    gap: Spacing.sm,
  },
  infoTitle: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  infoText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  assessmentCard: {
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  assessmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  qualTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  qualSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  chevron: { fontSize: 12, color: Colors.textMuted },
  assessmentBody: { gap: Spacing.base, padding: Spacing.base },
  progressSection: { gap: Spacing.xs },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 13, color: Colors.textSecondary },
  progressValue: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  criteriaList: { gap: Spacing.sm },
  criteriaHeader: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  addEvidenceBtn: { alignSelf: "flex-start" },
  evidenceList: { gap: Spacing.sm },
});
