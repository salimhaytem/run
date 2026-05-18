import { useCallback, useMemo, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheetGorhom, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { colors, spacing, radius, typography } from '@/theme/tokens';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: string[];
  children: ReactNode;
  scrollable?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function Sheet({ visible, onClose, title, snapPoints = ['50%'], children, scrollable = true }: SheetProps) {
  const sheetRef = useRef<BottomSheetGorhom>(null);

  const snapPts = useMemo(() => snapPoints, [snapPoints]);

  const handleChange = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!visible) return null;

  const Container = scrollable ? BottomSheetScrollView : View;

  return (
    <BottomSheetGorhom
      ref={sheetRef}
      index={0}
      snapPoints={snapPts}
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.indicator}
      handleStyle={styles.handle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        <Container style={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </Container>
      </KeyboardAvoidingView>
    </BottomSheetGorhom>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    paddingTop: spacing.sm,
  },
  indicator: {
    backgroundColor: colors.textSecondary,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
  },
});