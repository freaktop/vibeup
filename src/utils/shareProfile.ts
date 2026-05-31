import { Profile } from '../types';

const buildShareText = (profile: Profile) => {
  const tags = profile.tags?.length ? ` • ${profile.tags.slice(0, 3).join(', ')}` : '';
  return `Check out ${profile.name} on VibeUp${tags}`;
};

export const shareProfile = async (profile: Profile) => {
  const shareText = buildShareText(profile);
  const shareData = {
    title: 'VibeUp Profile',
    text: shareText,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    // Fall through to clipboard/prompt if share fails or is canceled
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      alert('Profile details copied to clipboard.');
      return;
    }
  } catch (error) {
    // Fall through to prompt
  }

  window.prompt('Copy profile details:', shareText);
};
