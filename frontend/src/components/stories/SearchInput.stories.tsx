import { SearchInput, SearchInputProps } from '../SearchInput';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<SearchInputProps> = {
  title: 'UI/SearchInput',
  component: SearchInput,
  args: {
    value: '',
    onChangeText: () => {},
  },
};

export default meta;

export const EmptySearch: StoryObj<SearchInputProps> = {
  args: {
    value: '',
    placeholder: 'Search train, city or operator...',
  },
};

export const ActiveSearchWithClear: StoryObj<SearchInputProps> = {
  args: {
    value: 'Berlin',
    placeholder: 'Search train, city or operator...',
  },
};

export const InteractiveSearchTyping: StoryObj<SearchInputProps> = {
  args: {
    value: '',
    placeholder: 'Search train, city or operator...',
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.getByPlaceholderText('Search train, city or operator...');
    fireEvent.changeText(input, 'Wien Hauptbahnhof');
  },
};
