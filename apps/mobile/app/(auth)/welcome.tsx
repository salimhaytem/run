import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography, gradients } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Trouve ton rythme',
    subtitle: 'Rejoins des courses locales, rencontre des runners de ton niveau et crée ta propre communauté de passionnés.',
    image: require('../../assets/images/slide1.png'),
    color: colors.primary,
  },
  {
    id: '2',
    title: 'Cours en sécurité',
    subtitle: 'Utilise notre bouton SOS intelligent et partage ta position en direct avec tes proches pour courir l\'esprit tranquille.',
    image: require('../../assets/images/slide2.png'),
    color: colors.danger,
  },
  {
    id: '3',
    title: 'Dépasse tes limites',
    subtitle: 'Rejoins des Crews, participe aux événements et trouve le Pacer idéal pour battre tes records personnels.',
    image: require('../../assets/images/slide3.png'),
    color: colors.accent,
  },
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.push('/(auth)/register');
    }
  };

  const renderItem = ({ item, index }: { item: typeof SLIDES[0], index: number }) => {
    return (
      <View style={styles.slide}>
        <Animated.View entering={FadeInDown.delay(index * 100).duration(600)} style={[styles.imageContainer, { shadowColor: item.color }]}>
          <View style={styles.imageWrapper}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
          </View>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(index * 100 + 200).duration(600)} style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(1000)} style={styles.brandContainer}>
        <Text style={styles.brand}>PACE</Text>
      </Animated.View>

      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </View>

      <Animated.View entering={FadeInDown.delay(600)} style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive,
                currentIndex === index && { backgroundColor: SLIDES[currentIndex].color }
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button 
            title={currentIndex === SLIDES.length - 1 ? "S'inscrire" : "Suivant"} 
            onPress={handleNext} 
            haptic="medium"
          />
          <Pressable 
            style={styles.loginLink} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginText}>Déjà un compte ? <Text style={styles.loginTextBold}>Se connecter</Text></Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  brandContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  brand: {
    ...typography.title,
    fontSize: 28,
    color: colors.text,
    letterSpacing: 2,
    fontWeight: '800',
  },
  carouselContainer: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  imageContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.xxl,
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  imageWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
  },
  buttonContainer: {
    gap: spacing.lg,
  },
  loginLink: {
    padding: spacing.sm,
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
