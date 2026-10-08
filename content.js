const BUTTON_CLASS = 'gh-copy-title-link';
const BUTTON_LABEL = 'Copy link with title';
const TOOLTIP_CLASS = 'gh-copy-title-link-tooltip';
const TOOLTIP_OFFSET = 4;
const PAGE_PATH_PATTERN = /^\/[^/]+\/[^/]+\/(?:issues|pull)\/\d+/;
const NUMBER_PREFIX_PATTERN = /^#\d+/;
const TITLE_CLASS = 'markdown-title';
const TITLE_SELECTOR = `h1 .${TITLE_CLASS}`;
// GitHub elements whose generated class names are borrowed, so that the button and its tooltip look like theirs
const ICON_BUTTON_SELECTOR = 'button[data-component="IconButton"][data-variant="invisible"]';
const ICON_BUTTON_CLASS_PREFIX = 'prc-Button-';
const ICON_BUTTON_DATASET = { component: 'IconButton', size: 'medium', variant: 'invisible', noVisuals: 'true' };
const TOOLTIP_SELECTOR = '[data-component="Tooltip"][popover]';
const TOOLTIP_CLASS_PREFIX = 'prc-TooltipV2-';
const REACT_ROOT_SELECTOR = 'react-app, react-partial';
const REACT_FIBER_PREFIX = '__reactFiber';
const HYDRATION_RETRY_DELAY_MS = 200;
const FEEDBACK_DURATION_MS = 1500;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ICON_SIZE = 16;
// Octicons `link` and `check`, 16 px
const LINK_ICON_PATH =
  'm7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z';
const CHECK_ICON_PATH =
  'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z';

let hydrationRetryTimeout;

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Returns the link to the issue or pull request of a heading, without the tab, query and anchor of the address.
const getPageLink = (heading) => {
  // A side panel names its issue by the link on its number, a page by its own address
  const numberLink = [...heading.querySelectorAll('a[href]')].find(
    (link) => !link.closest(`.${TITLE_CLASS}`) && PAGE_PATH_PATTERN.test(link.pathname),
  );
  const pagePath = (numberLink?.pathname ?? location.pathname).match(PAGE_PATH_PATTERN)?.[0];
  const title = heading.querySelector(`.${TITLE_CLASS}`)?.textContent.replace(/\s+/g, ' ').trim();
  if (!pagePath || !title) {
    return undefined;
  }
  return { title, url: `${location.origin}${pagePath}` };
};

// Writes the link as rich text, and as markdown for the fields that only take plain text.
const copyLink = async ({ title, url }) => {
  const html = `<a href="${escapeHtml(url)}">${escapeHtml(title)}</a>`;
  const markdown = `[${title.replace(/[\\[\]]/g, '\\$&')}](${url})`;
  const handleCopy = (event) => {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.clipboardData.setData('text/html', html);
    event.clipboardData.setData('text/plain', markdown);
  };

  document.addEventListener('copy', handleCopy, true);
  const isCopied = document.execCommand('copy');
  document.removeEventListener('copy', handleCopy, true);
  if (isCopied) {
    return;
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([markdown], { type: 'text/plain' }),
    }),
  ]);
};

// Returns the class names GitHub generated for one of its own components, read from an element of the page.
const getPrimerClassNames = (selector, prefix) =>
  [...(document.querySelector(selector)?.classList ?? [])].filter((className) => className.startsWith(prefix));

const setIcon = (button, iconPath) => {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ICON_SIZE} ${ICON_SIZE}`);
  svg.setAttribute('width', ICON_SIZE);
  svg.setAttribute('height', ICON_SIZE);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', iconPath);
  svg.append(path);
  button.replaceChildren(svg);
};

const showFeedback = (button, state) => {
  button.dataset.state = state;
  if (state === 'copied') {
    setIcon(button, CHECK_ICON_PATH);
  }
  setTimeout(() => {
    delete button.dataset.state;
    setIcon(button, LINK_ICON_PATH);
  }, FEEDBACK_DURATION_MS);
};

const showTooltip = (button, tooltip) => {
  if (!tooltip.isConnected || tooltip.matches(':popover-open')) {
    return;
  }
  tooltip.showPopover();
  const buttonRect = button.getBoundingClientRect();
  const centeredLeft = buttonRect.left + (buttonRect.width - tooltip.offsetWidth) / 2;
  const maxLeft = document.documentElement.clientWidth - tooltip.offsetWidth;
  tooltip.style.top = `${scrollY + buttonRect.bottom + TOOLTIP_OFFSET}px`;
  tooltip.style.left = `${scrollX + Math.max(Math.min(centeredLeft, maxLeft), 0)}px`;
};

const hideTooltip = (tooltip) => {
  if (tooltip.isConnected && tooltip.matches(':popover-open')) {
    tooltip.hidePopover();
  }
};

const handleClick = async (event) => {
  const button = event.currentTarget;
  // The button sits inside the heading on an issue, in the element that follows it on a pull request
  const heading = button.closest('h1') ?? button.parentElement.previousElementSibling;
  const pageLink = heading && getPageLink(heading);
  if (!pageLink) {
    return;
  }
  try {
    await copyLink(pageLink);
    showFeedback(button, 'copied');
  } catch (error) {
    console.error('github-copy-link:', error);
    showFeedback(button, 'failed');
  }
};

const createButton = () => {
  const button = document.createElement('button');
  const primerClassNames = getPrimerClassNames(ICON_BUTTON_SELECTOR, ICON_BUTTON_CLASS_PREFIX);
  button.type = 'button';
  button.classList.add(BUTTON_CLASS, ...primerClassNames);
  if (primerClassNames.length > 0) {
    Object.assign(button.dataset, ICON_BUTTON_DATASET);
  }
  button.setAttribute('aria-label', BUTTON_LABEL);
  setIcon(button, LINK_ICON_PATH);
  button.addEventListener('click', handleClick);
  return button;
};

// Returns a tooltip styled like those of GitHub, or nothing when the page has none to borrow the style from.
const createTooltip = (button) => {
  const primerClassNames = getPrimerClassNames(TOOLTIP_SELECTOR, TOOLTIP_CLASS_PREFIX);
  if (primerClassNames.length === 0) {
    return undefined;
  }
  const tooltip = document.createElement('span');
  tooltip.classList.add(TOOLTIP_CLASS, ...primerClassNames);
  tooltip.dataset.direction = 's';
  tooltip.setAttribute('popover', 'manual');
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.textContent = BUTTON_LABEL;
  button.addEventListener('mouseenter', () => showTooltip(button, tooltip));
  button.addEventListener('focus', () => showTooltip(button, tooltip));
  button.addEventListener('mouseleave', () => hideTooltip(tooltip));
  button.addEventListener('blur', () => hideTooltip(tooltip));
  return tooltip;
};

// Returns the element that holds the number and the edit button: next to the heading on a pull request, inside it on an issue.
const getButtonContainer = (heading) =>
  [heading.nextElementSibling, heading.lastElementChild].find(
    (element) =>
      element && !element.classList.contains(TITLE_CLASS) && NUMBER_PREFIX_PATTERN.test(element.textContent.trim()),
  ) ?? heading;

// Returns whether React is done with the heading: a node added before that makes the hydration fail.
const isHydrated = (heading) => {
  if (!heading.closest(REACT_ROOT_SELECTOR)) {
    return true;
  }
  // `wrappedJSObject` gives a Firefox content script the properties set by the page
  return Object.keys(heading.wrappedJSObject ?? heading).some((key) => key.startsWith(REACT_FIBER_PREFIX));
};

const ensureButton = (heading) => {
  if (!getPageLink(heading)) {
    return;
  }
  const container = getButtonContainer(heading);
  if (container.querySelector(`.${BUTTON_CLASS}`)) {
    return;
  }
  if (!isHydrated(heading)) {
    clearTimeout(hydrationRetryTimeout);
    hydrationRetryTimeout = setTimeout(ensureButtons, HYDRATION_RETRY_DELAY_MS);
    return;
  }
  const button = createButton();
  const tooltip = createTooltip(button);
  if (tooltip) {
    container.append(button, tooltip);
  } else {
    button.title = BUTTON_LABEL;
    container.append(button);
  }
};

// A page shows one title, plus the one of the side panel when an issue is open in it.
const ensureButtons = () => {
  const titles = [...document.querySelectorAll(TITLE_SELECTOR)];
  new Set(titles.map((title) => title.closest('h1'))).forEach(ensureButton);
};

// GitHub changes page without reloading, and React may redraw a heading: the button is put back each time.
new MutationObserver(ensureButtons).observe(document.documentElement, { childList: true, subtree: true });
ensureButtons();
