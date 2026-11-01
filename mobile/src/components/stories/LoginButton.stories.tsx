import { LoginButton, LoginButtonProps } from '../LoginButton';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<LoginButtonProps> = {
  title: 'UI/LoginButton',
  component: LoginButton,
  args: {
    provider: 'voyagerail',
    isLoggedIn: false,
  },
};

export default meta;

export const VoyageRail: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'voyagerail',
  },
};

export const VoyageRailLoggedIn: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'voyagerail',
    isLoggedIn: true,
  },
};

export const GoogleAuth: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'google',
  },
};

export const AppleAuth: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'apple',
  },
};

export const EmailAuth: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'email',
  },
};

export const GuestAuth: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'guest',
  },
};

export const InteractiveLogin: StoryObj<LoginButtonProps> = {
  args: {
    provider: 'google',
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.getByTestId('login-button-google');
    fireEvent(btn, 'hoverIn');
    fireEvent(btn, 'hoverOut');
    fireEvent.press(btn);
  },
};
