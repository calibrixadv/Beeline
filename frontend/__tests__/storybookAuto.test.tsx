import { stories } from '../.storybook/storybook.requires';
import { renderStory, fireEvent } from '../.storybook/testing';

describe('Storybook Automated UI Component Testing Library', () => {
  it('has registered stories for every UI component', () => {
    expect(stories.length).toBeGreaterThanOrEqual(16);
    const storyNames = stories.map((s) => s.name);

    expect(storyNames).toContain('BaseButton');
    expect(storyNames).toContain('LoginButton');
    expect(storyNames).toContain('PlanButton');
    expect(storyNames).toContain('IconButton');
    expect(storyNames).toContain('ResetButton');
    expect(storyNames).toContain('BaseBadge');
    expect(storyNames).toContain('StatusBadge');
    expect(storyNames).toContain('AmenityBadge');
    expect(storyNames).toContain('BaseCard');
    expect(storyNames).toContain('BaseInput');
    expect(storyNames).toContain('SearchInput');
    expect(storyNames).toContain('AmenityIcon');
    expect(storyNames).toContain('TrainCard');
    expect(storyNames).toContain('FilterBar');
    expect(storyNames).toContain('TrainDetailModal');
    expect(storyNames).toContain('TripSummaryBanner');
    expect(storyNames).toContain('LoadingSpinner');
    expect(storyNames).toContain('ScreenLoader');
    expect(storyNames).toContain('Navbar');
  });


  // Dynamically generate automated test suites for every component story
  stories.forEach((storyGroup) => {
    describe(`Storybook: ${storyGroup.name}`, () => {
      const defaultArgs = (storyGroup.module.default.args || {}) as Record<string, unknown>;
      const Component = storyGroup.module.default.component as React.ComponentType<Record<string, unknown>>;
      const storyEntries = Object.entries(storyGroup.module).filter(
        ([key]) => key !== 'default'
      );

      it('renders default story without crashing', () => {
        const renderResult = renderStory(Component, defaultArgs);
        expect(renderResult.toJSON()).not.toBeNull();
      });

      storyEntries.forEach(([exportName, storyObj]) => {
        it(`renders story variant: "${exportName}" accurately`, async () => {
          const castStory = storyObj as {
            args?: Record<string, unknown>;
            play?: (context: { canvasElement: unknown; args: unknown }) => Promise<void> | void;
          };
          const mergedArgs = { ...defaultArgs, ...(castStory.args || {}) } as Record<string, unknown>;
          const renderResult = renderStory(Component, mergedArgs);

          expect(renderResult.toJSON()).not.toBeNull();

          // If the story specifies an automated play function, execute it
          if (typeof castStory.play === 'function') {
            await castStory.play({ canvasElement: renderResult, args: mergedArgs });
          }
        });
      });

      // Automated interaction testing for components accepting onPress / onClick
      it('handles automated onClick/onPress interaction when supported', () => {
        const isPressable = [
          'BaseButton',
          'LoginButton',
          'PlanButton',
          'IconButton',
          'ResetButton',
          'BaseBadge',
          'StatusBadge',
          'BaseCard',
        ].includes(storyGroup.name);

        if (isPressable) {
          const handlePress = jest.fn();
          const renderResult = renderStory(Component, { ...defaultArgs, onPress: handlePress });
          const targetElement = renderResult.getByRole('button');
          fireEvent.press(targetElement);
          expect(handlePress).toHaveBeenCalled();
        } else {
          // Static or composite container component
          const renderResult = renderStory(Component, defaultArgs);
          expect(renderResult.toJSON()).not.toBeNull();
        }
      });

      // Automated interaction testing for components accepting onHoverIn / onHoverOut
      it('handles automated onHover interaction when supported', () => {
        const isHoverable = [
          'BaseButton',
          'LoginButton',
          'PlanButton',
          'IconButton',
          'ResetButton',
          'BaseBadge',
          'StatusBadge',
          'BaseCard',
          'BaseInput',
          'SearchInput',
        ].includes(storyGroup.name);

        if (isHoverable) {
          const handleHoverIn = jest.fn();
          const handleHoverOut = jest.fn();
          const renderResult = renderStory(Component, {
            ...defaultArgs,
            onHoverIn: handleHoverIn,
            onHoverOut: handleHoverOut,
          });

          let targetElement = null;
          try {
            targetElement = renderResult.getByRole('button');
          } catch {
            targetElement = renderResult.getByTestId(
              storyGroup.name === 'SearchInput' ? 'search-input-container' : 'base-input-container'
            );
          }

          if (targetElement) {
            fireEvent(targetElement, 'hoverIn');
            expect(handleHoverIn).toHaveBeenCalled();
            fireEvent(targetElement, 'hoverOut');
            expect(handleHoverOut).toHaveBeenCalled();
          }
        } else {
          // Static component
          const renderResult = renderStory(Component, defaultArgs);
          expect(renderResult.toJSON()).not.toBeNull();
        }
      });
    });
  });
});
