/**
 * app/(worker)/qualifications.tsx — Qualification catalogue screen (real API).
 *
 * Shows the qualification catalogue from GET /qualifications with criteria.
 * Workers can browse, view criteria details, and navigate to evidence submission.
 * Includes illustrative disclaimer when qualification is_illustrative=true.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import {
  useQualifications,
  useQualificationDetail,
} from "../../hooks/useQualifications";
import { useMyEvidence } from "../../hooks/useEvidence";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { EmptyState } from "../../components/ui/EmptyState";

const TABS = ["Catalogue", "Evidence"] as const;
type Tab = (typeof TABS)[number];

const TRADE_FILTERS = [
  "All",
  "Electrical",
  "Plumbing",
  "Carpentry",
  "Masonry",
  "HVAC",
];

export default function QualificationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("Catalogue");
  const [tradeFilter, setTradeFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { qualifications, loading, error, refetch } = useQualifications(
    tradeFilter === "All" ? undefined : tradeFilter
  );
  const { qualification: detail, criteria, loading: detailLoading } =
    useQualificationDetail(expandedId);
  const { items: evidence, loading: evidenceLoading, refetch: refetchEvidence } =
    useMyEvidence();

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
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Catalogue tab ── */}
      {activeTab === "Catalogue" ? (
        <>
          {/* Trade filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterContent}
          >
            {TRADE_FILTERS.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.filterChip,
                  tradeFilter === t && styles.filterChipActive,
                ]}
                onPress={() => {
                  setTradeFilter(t);
                  setExpandedId(null);
                }}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    tradeFilter === t && styles.filterChipLabelActive,
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading catalogue…</Text>
            </View>
          ) : error ? (
            <EmptyState
              icon="⚠️"
              title="Could not load qualifications"
              description={error}
              actionLabel="Retry"
              onAction={refetch}
            />
          ) : qualifications.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No qualifications found"
              description="Try a different trade filter."
            />
          ) : (
            qualifications.map((q) => {
              const isExpanded = expandedId === q.id;
              return (
                <Card key={q.id} padded={false} style={styles.qualCard}>
                  {/* Qualification header */}
                  <Pressable
                    style={styles.qualHeader}
                    onPress={() =>
                      setExpandedId(isExpanded ? null : q.id)
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.qualTitleRow}>
                        <Text style={styles.qualCode}>{q.code}</Text>
                        <Badge
                          label={`Level ${q.level}`}
                          variant="default"
                          size="sm"
                        />
                        {q.is_illustrative && (
                          <Badge
                            label="Illustrative"
                            variant="warning"
                            size="sm"
                          />
                        )}
                      </View>
                      <Text style={styles.qualTitle}>{q.title}</Text>
                      <Text style={styles.qualSub}>
                        {q.trade} · {q.issuing_body}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>
                      {isExpanded ? "▲" : "▼"}
                    </Text>
                  </Pressable>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <View style={styles.qualBody}>
                      <Divider spacing={0} />

                      {/* Illustrative disclaimer */}
                      {q.is_illustrative && (
                        <View style={styles.disclaimer}>
                          <Text style={styles.disclaimerText}>
                            ⚠️ The criteria below are{" "}
                            <Text style={{ fontWeight: "800" }}>
                              illustrative examples only
                            </Text>{" "}
                            and have not been individually verified against
                            the official NCVT gazette or NSQF framework.
                          </Text>
                          {q.source_url && (
                            <Pressable
                              onPress={() =>
                                Linking.openURL(q.source_url!)
                              }
                            >
                              <Text style={styles.sourceLink}>
                                View authoritative source ↗
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}

                      {/* Criteria */}
                      {detailLoading && expandedId === q.id ? (
                        <ActivityIndicator color={Colors.primary} />
                      ) : (
                        <View style={styles.criteriaList}>
                          <Text style={styles.criteriaHeader}>
                            Competency Criteria
                          </Text>
                          {criteria.map((c, idx) => (
                            <View key={c.id} style={styles.criterionItem}>
                              <View style={styles.criterionTop}>
                                <View style={styles.criterionIndex}>
                                  <Text style={styles.criterionIndexText}>
                                    {idx + 1}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View style={styles.criterionCodeRow}>
                                    <Text style={styles.criterionCode}>
                                      {c.code}
                                    </Text>
                                    {c.is_mandatory && (
                                      <Badge
                                        label="Mandatory"
                                        variant="error"
                                        size="sm"
                                      />
                                    )}
                                    {c.rubric_reference && (
                                      <Text style={styles.rubricRef}>
                                        {c.rubric_reference}
                                      </Text>
                                    )}
                                  </View>
                                  <Text style={styles.criterionDesc}>
                                    {c.description}
                                  </Text>
                                  {c.guidance && (
                                    <Text style={styles.criterionGuidance}>
                                      {c.guidance}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      <Button
                        label="Submit Evidence for this Qualification"
                        variant="primary"
                        size="md"
                        onPress={() =>
                          router.push("/(worker)/evidence-submit")
                        }
                      />
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </>
      ) : (
        /* ── Evidence tab ── */
        <>
          <Button
            label="+ Add New Evidence"
            variant="primary"
            size="md"
            onPress={() => router.push("/(worker)/evidence-submit")}
            style={styles.addBtn}
          />

          {evidenceLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : evidence.length === 0 ? (
            <EmptyState
              icon="📎"
              title="No evidence submitted"
              description="Upload photos, certificates, or documents to support your qualifications."
              actionLabel="Submit Evidence"
              onAction={() => router.push("/(worker)/evidence-submit")}
            />
          ) : (
            <View style={styles.evidenceList}>
              {evidence.map((item) => {
                const statusColor =
                  item.review_status === "accepted"
                    ? Colors.success
                    : item.review_status === "rejected"
                    ? Colors.error
                    : item.review_status === "under_review"
                    ? Colors.warning
                    : Colors.textMuted;
                const statusLabel =
                  item.review_status === "accepted"
                    ? "Accepted ✓"
                    : item.review_status === "rejected"
                    ? "Rejected"
                    : item.review_status === "under_review"
                    ? "Under Review"
                    : "Pending Review";
                return (
                  <Card key={item.id} style={styles.evidenceCard}>
                    <View style={styles.evidenceHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.evidenceTitle}>{item.title}</Text>
                        <Text style={styles.evidenceType}>
                          {item.evidence_type}
                          {item.original_filename
                            ? ` · ${item.original_filename}`
                            : ""}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.statusLabel, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                    {item.review_note && (
                      <Text style={styles.reviewNote}>
                        📝 {item.review_note}
                      </Text>
                    )}
                    <Text style={styles.evidenceDate}>
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  centered: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xl },
  loadingText: { fontSize: 14, color: Colors.textSecondary },

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
  tabBtnActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  tabLabelActive: { color: Colors.white },

  filterRow: { marginHorizontal: -Spacing.base },
  filterContent: { paddingHorizontal: Spacing.base, gap: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  filterChipLabel: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary },
  filterChipLabelActive: { color: Colors.primary, fontWeight: "700" },

  qualCard: { borderWidth: 1, borderColor: Colors.divider, overflow: "hidden" },
  qualHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  qualTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  qualCode: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  qualTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  qualSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  qualBody: { gap: Spacing.base, padding: Spacing.base },
  disclaimer: {
    backgroundColor: Colors.warning + "15",
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  disclaimerText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  sourceLink: { fontSize: 12, color: Colors.primary, fontWeight: "600" },

  criteriaList: { gap: Spacing.sm },
  criteriaHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  criterionItem: {
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  criterionTop: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  criterionIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  criterionIndexText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  criterionCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  criterionCode: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  rubricRef: { fontSize: 10, color: Colors.textMuted, fontStyle: "italic" },
  criterionDesc: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  criterionGuidance: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: "italic",
  },

  addBtn: { alignSelf: "flex-start" },
  evidenceList: { gap: Spacing.sm },
  evidenceCard: { gap: Spacing.xs },
  evidenceHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  evidenceTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  evidenceType: { fontSize: 11, color: Colors.textMuted, textTransform: "capitalize" },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  reviewNote: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  evidenceDate: { fontSize: 11, color: Colors.textMuted },
});
