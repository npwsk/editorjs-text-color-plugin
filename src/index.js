/**
 * Build styles
 */
const Picker = require('./picker');
const { markerIcon, textIcon } = require('./icons');
const { getDefaultColorCache, handleCSSVariables } = require('./picker/utils/main');
require('./index.css').toString();

const MARKER_PARENT_TAG = 'MARK';
const TEXT_PARENT_TAG = 'SPAN';
const TEXT_PARENT_CLASSNAME = 'editor-text-color';

/**
 * Text Color Tool for Editor.js
 */
class Color {

  /**
   * @param {{api: object}}  - Editor.js API
   */
  constructor({ config, api }) {
    this.api = api;
    this.config = config;
    this.clickedOnLeft = false;
    this.pluginType = this.config.type || 'text';
    this.parentTag = this.pluginType === 'marker' ? MARKER_PARENT_TAG : TEXT_PARENT_TAG;
    this.parentClassName = this.pluginType === 'text' ? TEXT_PARENT_CLASSNAME : null;
    this.hasCustomPicker = this.config.customPicker || false;
    this.color = handleCSSVariables(
        getDefaultColorCache(this.config.defaultColor, this.pluginType)
    );
    this.picker = null;
    this.icon = null;

    /**
     * Toolbar Button
     *
     * @type {HTMLElement|null}
     */
    this.button = null;

    /**
     * CSS classes
     */
    this.iconClasses = {
      base: this.api.styles.inlineToolButton,
      active: this.api.styles.inlineToolButtonActive,
    };
  }

  /**
   * Specifies Tool as Inline Toolbar Tool
   *
   * @return {boolean}
   */
  static get isInline() {
    return true;
  }

  /**
   * Create button element for Toolbar
   *
   * @return {HTMLElement}
   */
  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('colorPlugin');
    this.button.classList.add(this.iconClasses.base);
    this.button.appendChild(this.createLeftButton());
    this.button.appendChild(this.createRightButton(this));

    return this.button;
  }

  /**
   * Create left part button
   *
   * @return {HTMLElement}
   */
  createLeftButton() {
    if (!this.icon) {
      this.icon = document.createElement('div');
      this.icon.id = 'color-left-btn';
      this.icon.appendChild(this.createButtonIcon());
      this.icon.addEventListener('click', () => this.clickedOnLeft = true);
    }

    return this.icon;
  }

  /**
   * Create button icon
   *
   * @return {HTMLElement}
   */
  createButtonIcon() {
    const buttonIcon = document.createElement('div');
    buttonIcon.id = 'color-btn-text';
    const defaultIcon = this.pluginType === 'marker' ? markerIcon : textIcon;
    buttonIcon.innerHTML = this.config.icon || defaultIcon;
    return buttonIcon;
  }

  /**
   * Create right part button
   *
   * @return {HTMLElement}
   */
  createRightButton(sharedScope) {
    if (!this.picker) {
      this.picker = new Picker.ColorPlugin({
        onColorPicked: function (value) {
          sharedScope.color = value;
        },
        hasCustomPicker: this.hasCustomPicker,
        defaultColor: this.config.defaultColor,
        colorCollections: this.config.colorCollections,
        type: this.pluginType
      });
    }

    return this.picker;
  }

  /**
   * handle selected fragment
   *
   * @param {Range} range - selected fragment
   */
  surround(range) {
    if (!range) {
      return
    }

    /**
     * If start or end of selection is in the highlighted block
     */
    const termWrapper = this.findSelectionParentTag();

    if (termWrapper) {
      this.unwrap(termWrapper);
    } else {
      this.wrap(range);
    }

    this.clickedOnLeft = false;
  }

  /**
   * Wrap selected fragment
   *
   * @param {Range} range - selected fragment
   */
  wrap(range) {
    const selectedText = range.extractContents();
    const newWrapper = document.createElement(this.parentTag);
    if (this.parentClassName) {
      newWrapper.classList.add(this.parentClassName);
    }

    newWrapper.appendChild(selectedText);
    range.insertNode(newWrapper);

    if (this.pluginType === 'marker') {
      this.wrapMarker(newWrapper);
    } else {
      this.wrapTextColor(newWrapper);
    }

    this.api.selection.expandToTag(newWrapper);
  }

  /**
   * Wrap selected marker fragment
   *
   * @param newWrapper - wrapper for selected fragment
   */
  wrapMarker(newWrapper) {
    newWrapper.style.backgroundColor = this.color;
    const colorWrapper = this.api.selection.findParentTag(TEXT_PARENT_TAG, TEXT_PARENT_CLASSNAME);
    if (colorWrapper) newWrapper.style.color = colorWrapper.style.color;
  }

  /**
   * Wrap selected text color fragment
   *
   * @param {Range} newWrapper - wrapper for selected fragment
   */
  wrapTextColor(newWrapper) {
    newWrapper.style.color = this.color;
  }

  /**
   * Unwrap selected fragment
   *
   * @param {Range} termWrapper - parent of selected fragment
   */
  unwrap(termWrapper) {
    /**
     * Expand selection to all term-tag
     */
    this.api.selection.expandToTag(termWrapper)

    const sel = window.getSelection()
    const range = sel.getRangeAt(0)

    const unwrappedContent = range.extractContents()

    /**
     * Remove empty term-tag
     */
    if (this.clickedOnLeft) {
      this.removeWrapper(termWrapper);
    } else {
      this.updateWrapper(termWrapper);
    }

    /**
     * Insert extracted content
     */
    range.insertNode(unwrappedContent)

    /**
     * Restore selection
     */
    sel.removeAllRanges()
    sel.addRange(range)
  }

  /**
   * update color without create a new tag
   *
   * @param {Range} termWrapper - parent of selected fragment
   */
  updateWrapper(termWrapper) {
    if (this.pluginType === 'marker') {
      termWrapper.style.backgroundColor = this.color;
    } else {
      termWrapper.style.color = this.color;
    }
  }

  /**
   * remove wrapper
   *
   * @param {Range} termWrapper - parent of selected fragment
   */
  removeWrapper(termWrapper) {
    termWrapper.parentNode.removeChild(termWrapper);
  }

  /**
   * Check and change Term's state for current selection
   */
  checkState() {
    let isWrapped = this.findSelectionParentTag();
    this.button.classList.toggle(this.iconClasses.active, !!isWrapped)

    return !!isWrapped;
  }

  findSelectionParentTag() {
    if (this.pluginType === 'marker') {
      return this.api.selection.findParentTag(MARKER_PARENT_TAG);
    }

    return this.api.selection.findParentTag(TEXT_PARENT_TAG, TEXT_PARENT_CLASSNAME);
  }

  /**
   * Sanitizer rule
   * @return {{color: {class: string}}}
   */
  static get sanitize() {
    return {
      span: true,
      mark: true,
    };
  }

  clear() {
    this.picker = null;
    this.icon = null;
  }
}

module.exports = Color;
