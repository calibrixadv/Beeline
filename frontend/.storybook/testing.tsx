import React from 'react';
import {
  render,
  RenderResult,
  fireEvent as rnFireEvent,
  waitFor as rnWaitFor,
  act,
  within,
} from '@testing-library/react-native';
import * as sbTestingLib from '@storybook/testing-library';
import { TripProvider } from '../src/context/TripContext';

export interface StoryMeta<TProps = Record<string, unknown>> {
  title: string;
  component: React.ComponentType<TProps>;
  args?: Partial<TProps>;
  decorators?: Array<(Story: React.ComponentType) => React.ReactElement>;
}

export interface StoryObj<TProps = Record<string, unknown>> {
  args?: Partial<TProps>;
  play?: (context: { canvasElement: RenderResult; args: TProps }) => Promise<void> | void;
  render?: (args: TProps) => React.ReactElement;
}

/**
 * User event helpers for Storybook play functions in React Native environment
 */
export const userEvent = {
  press: (element: Parameters<typeof rnFireEvent.press>[0]) => rnFireEvent.press(element),
  type: (element: Parameters<typeof rnFireEvent.changeText>[0], text: string) =>
    rnFireEvent.changeText(element, text),
  hover: (element: unknown) => rnFireEvent(element as Parameters<typeof rnFireEvent>[0], 'hoverIn'),
  unhover: (element: unknown) => rnFireEvent(element as Parameters<typeof rnFireEvent>[0], 'hoverOut'),
};

/**
 * Renders a component story wrapped with standard context decorators
 */
export function renderStory<TProps extends Record<string, unknown>>(
  Component: React.ComponentType<TProps>,
  storyArgs: TProps,
  customDecorator?: (Story: React.ComponentType) => React.ReactElement
): RenderResult {
  const StoryWrapper: React.FC = () => <Component {...storyArgs} />;

  if (customDecorator) {
    return render(
      <TripProvider>
        {customDecorator(StoryWrapper)}
      </TripProvider>
    );
  }

  return render(
    <TripProvider>
      <StoryWrapper />
    </TripProvider>
  );
}

export const fireEvent = rnFireEvent;
export const waitFor = rnWaitFor;
export { render, RenderResult, act, within, sbTestingLib as storybookTestingLibrary };

