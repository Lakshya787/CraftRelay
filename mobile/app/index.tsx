/**
 * app/index.tsx — Landing screen with onboarding slides.
 *
 * Part 2: Full landing with onboarding carousel and role selection.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../constants/colors";
import { Spacing, Radius } from "../constants/spacing";
import { ONBOARDING_SLIDES } from "../data/mockData";
import { Button } from "../components/ui/Button";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LandingScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(idx);
  }

  function handleNext() {
    if (activeSlide < ONBOARDING_SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeSlide + 1) * SCREEN_WIDTH, animated: true });
    } else {
      router.push("/login");
    }
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>CR</Text>
        </View>
        <Text style={styles.logoName}>CraftRelay</Text>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
      >
        {ONBOARDING_SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Text style={styles.slideIcon}>{slide.icon}</Text>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {ONBOARDING_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, activeSlide === i && styles.dotActive]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={activeSlide === ONBOARDING_SLIDES.length - 1 ? "Get Started" : "Next"}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleNext}
        />
        <Pressable
          onPress={() => router.push("/login")}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>
            Already have an account?{" "}
            <Text style={styles.skipLink}>Sign in</Text>
          </Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>Smart India Hackathon · SIH 2025</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,   // --dp-color-ground: #fcfcfd
    paddingTop: Spacing["3xl"],
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,              // --dp-radius-panel: 12px
    backgroundColor: Colors.primary,      // --dp-color-accent: #074ce0
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  logoName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,            // --dp-color-ink: #16191f
    letterSpacing: -0.6,                  // display tight tracking
  },
  carousel: {
    flexGrow: 0,
  },
  slide: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.base,
  },
  slideIcon: {
    fontSize: 72,
    marginBottom: Spacing.base,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,            // --dp-color-ink
    textAlign: "center",
    lineHeight: 34,                       // 28 × tight 1.2
    letterSpacing: -0.4,
  },
  slideSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,          // --dp-color-ink-secondary: #454c58
    textAlign: "center",
    lineHeight: 26,                       // 16 × relaxed 1.6
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginVertical: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.divider,      // --dp-color-rule: #dde0e6
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,     // --dp-color-accent
  },
  actions: {
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.base,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  skipLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: Spacing["2xl"],
    alignSelf: "center",
    fontSize: 11,
    color: Colors.textMuted,
  },
});
