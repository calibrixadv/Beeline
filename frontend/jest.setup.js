/* eslint-env jest */
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({}),
    Link: ({ children, ...props }) => React.createElement(View, props, children),
    Stack: {
      Screen: () => null,
    },
    mockRouter,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(Text, props, props.name),
    MaterialIcons: (props) => React.createElement(Text, props, props.name),
    MaterialCommunityIcons: (props) => React.createElement(Text, props, props.name),
    Feather: (props) => React.createElement(Text, props, props.name),
  };
});

if (typeof global !== 'undefined') {
  if (!global.window) {
    global.window = global;
  }
  global.window.window = global.window;
  global.window.parent = global.window;
  if (!global.window.location) {
    global.window.location = { search: '' };
  }
  global.window.__STORYBOOK_ADDON_INTERACTIONS_INSTRUMENTER_STATE__ = {
    parentCallId: '',
  };
}
