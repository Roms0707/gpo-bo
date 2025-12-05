export function updateFavicon(faviconUrl: string): void {
  try {
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach((favicon) => favicon.remove());

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    document.head.appendChild(link);

    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = faviconUrl;
    document.head.appendChild(appleLink);

    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = 'image/x-icon';
    shortcutLink.href = faviconUrl;
    document.head.appendChild(shortcutLink);
  } catch (error) {
    console.error('Error updating favicon:', error);
  }
}
