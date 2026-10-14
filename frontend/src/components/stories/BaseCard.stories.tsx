import React from 'react';
import { Text } from 'react-native';
import { BaseCard, BaseCardProps } from '../BaseCard';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<BaseCardProps> = {
  title: 'UI/BaseCard',
  component: BaseCard,
  args: {
    variant: 'elevated',
    padding: 'md',
  },
};

export default meta;

export const Elevated: StoryObj<BaseCardProps> = {
  args: {
    variant: 'elevated',
    padding: 'md',
    children: <Text>Elevated Card Container</Text>,
  },
};

export const Outlined: StoryObj<BaseCardProps> = {
  args: {
    variant: 'outlined',
    padding: 'md',
    children: <Text>Outlined Card Container</Text>,
  },
};

export const Flat: StoryObj<BaseCardProps> = {
  args: {
    variant: 'flat',
    padding: 'md',
    children: <Text>Flat Card Container</Text>,
  },
};

export const Interactive: StoryObj<BaseCardProps> = {
  args: {
    variant: 'elevated',
    padding: 'lg',
    onPress: () => {},
    children: <Text>Interactive Pressable Card</Text>,
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.getByRole('button');
    fireEvent(card, 'hoverIn');
    fireEvent(card, 'hoverOut');
    fireEvent.press(card);
  },
};
