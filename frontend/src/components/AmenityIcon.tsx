import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Amenity } from '../types/train';

interface AmenityIconProps {
  amenity: Amenity;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export const AmenityIcon: React.FC<AmenityIconProps> = ({ amenity }) => {
  const getIconConfig = (type: Amenity): { name: IoniconsName; label: string } => {
    switch (type) {
      case 'WIFI':
        return { name: 'wifi', label: 'Free Wi-Fi' };
      case 'POWER_OUTLETS':
        return { name: 'flash', label: 'Power outlets' };
      case 'DINING_CAR':
        return { name: 'restaurant', label: 'Dining car' };
      case 'BIKE_STORAGE':
        return { name: 'bicycle', label: 'Bike storage' };
      case 'WHEELCHAIR_ACCESSIBLE':
        return { name: 'body', label: 'Accessible' };
      case 'QUIET_ZONE':
        return { name: 'volume-mute', label: 'Quiet zone' };
      default:
        return { name: 'checkmark-circle-outline', label: type };
    }
  };

  const config = getIconConfig(amenity);

  return (
    <View style={styles.container} accessibilityLabel={config.label} accessibilityRole="text">
      <Ionicons name={config.name} size={14} color="#64748B" />
      <Text style={styles.label}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: '#475569',
    marginLeft: 4,
    fontWeight: '500',
  },
});
