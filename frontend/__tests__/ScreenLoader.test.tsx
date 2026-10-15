import React from 'react';
import { render } from '@testing-library/react-native';
import { ScreenLoader } from '../src/components/ScreenLoader';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('ScreenLoader component', () => {
  it('renders overlay, brand text, and placeholder favicon when visible', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <ScreenLoader
          visible={true}
          message="Switching routes..."
          subtitle="Beeline High-Speed Corridor"
        />
      </ThemeProvider>
    );

    expect(getByTestId('screen-loader')).toBeTruthy();
    expect(getByTestId('screen-loader-favicon-placeholder')).toBeTruthy();
    expect(getByText('BEELINE')).toBeTruthy();
    expect(getByText('Switching routes...')).toBeTruthy();
    expect(getByText('Beeline High-Speed Corridor')).toBeTruthy();
  });

  it('renders null when visible is false', () => {
    const { queryByTestId } = render(
      <ThemeProvider>
        <ScreenLoader visible={false} />
      </ThemeProvider>
    );

    expect(queryByTestId('screen-loader')).toBeNull();
  });
});
