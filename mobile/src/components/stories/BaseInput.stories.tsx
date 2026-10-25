import { BaseInput, BaseInputProps } from '../BaseInput';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

const meta: StoryMeta<BaseInputProps> = {
  title: 'UI/BaseInput',
  component: BaseInput,
  args: {
    value: '',
    onChangeText: () => {},
    placeholder: 'Enter text here...',
    clearable: true,
  },
};

export default meta;

export const Default: StoryObj<BaseInputProps> = {
  args: {
    placeholder: 'Standard input placeholder',
    value: '',
  },
};

export const WithValueAndClearable: StoryObj<BaseInputProps> = {
  args: {
    value: 'Pre-filled search query',
    clearable: true,
  },
};

export const WithLabel: StoryObj<BaseInputProps> = {
  args: {
    label: 'Passenger Full Name',
    placeholder: 'e.g. Jean Dupont',
    value: '',
  },
};

export const WithError: StoryObj<BaseInputProps> = {
  args: {
    label: 'Email Address',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

export const Disabled: StoryObj<BaseInputProps> = {
  args: {
    label: 'Station Code',
    value: 'FRPLY',
    disabled: true,
  },
};
