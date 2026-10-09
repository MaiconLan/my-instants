import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { colors, fonts } from '../lib/theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({
  name,
  size = 24,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export function T({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: fonts.regular, color: colors.text, fontSize: 16 },
});
