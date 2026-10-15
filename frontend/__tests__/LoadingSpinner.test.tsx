import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('LoadingSpinner UI component', () => {
  it('renders default spinner with accessibility attributes', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <LoadingSpinner />
      </ThemeProvider>
    );

    const spinner = getByTestId('loading-spinner');
    expect(spinner).toBeTruthy();
    expect(spinner.props.accessibilityRole).toBe('progressbar');
    expect(spinner.props.accessibilityState).toEqual({ busy: true });
  });


  it('renders with custom label and subtitle', () => {
    const { getByText } = render(
      <ThemeProvider>
        <LoadingSpinner
          label="Connecting to Beeline rail..."
          subtitle="Estimated time: 1s"
        />
      </ThemeProvider>
    );

    expect(getByText('Connecting to Beeline rail...')).toBeTruthy();
    expect(getByText('Estimated time: 1s')).toBeTruthy();
  });

  it('renders without central placeholder mark when placeholderIcon is false', () => {
    const { queryByTestId } = render(
      <ThemeProvider>
        <LoadingSpinner placeholderIcon={false} />
      </ThemeProvider>
    );

    expect(queryByTestId('loading-spinner-center')).toBeNull();
  });

  it('renders across all size tiers cleanly', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach((size) => {
      const { getByTestId } = render(
        <ThemeProvider>
          <LoadingSpinner size={size} testID={`spinner-${size}`} />
        </ThemeProvider>
      );
      expect(getByTestId(`spinner-${size}`)).toBeTruthy();
    });
  });
});
