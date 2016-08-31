'use babel';

import atom from 'atom';
import CoffeeParser from './languages/coffee.js';
import JavscriptParser from './languages/javascript.js';

const PACKAGE_SLUG = 'atomdocr';

export default class AtomDocr {
  constructor() {
    this.settings = atom.config.get(PACKAGE_SLUG);
    atom.config.observe('docblockr', () => {
      this.updateConfig();
    });
    atom.commands.add('atom-workspace', 'docblockr:parse-tab', this.parseTab);
  }
  parseTab(event) {
    this.event = event;
    const regex = {
      // Parse Command
      parse: /^\s*(\/\*|###)[*!]\s*$/,
      // Indent Command
      indent: /^\s*\*\s*$/,
    };
    // Parse Command
    if (this.validateRequest({ preceding: true, preceding_regex: regex.parse })) {
      // console.log('Parse command');
      this.parseCommand(false);
    } else if (this.validateRequest({ preceding: true, preceding_regex: regex.indent })) {
      // Indent Command
      // console.log('Indent command');
      this.indent_command();
    } else {
      this.event.abortKeyBinding();
    }
  }
  validateRequest(options = {}) {
    const preceding = options.preceding || false;
    const precedingRegex = options.preceding_regex || '';
    const following = options.following || false;
    const followingRegex = options.following_regex || '';
    const scope = options.scope || false;
    const editor = atom.workspace.getActiveTextEditor();
    let index;
    const cursorPositions = editor.getCursors();
    this.cursors = [];

    for (index = 0, index < cursorPositions.length; index++;) {
      const cursorPosition = cursorPositions[index].getBufferPosition();

      if (scope && this.checkScope(cursorPosition, scope)) break;

      if (preceding && following) {
        if (this.checkProceeding(cursorPosition, precedingRegex)
        && this.checkFollowing(cursorPosition, followingRegex)) {
          this.cursors.push(cursorPosition);
          break;
        }
      } else if (preceding) {
        if (this.checkProceeding(cursorPosition, precedingRegex)) {
          this.cursors.push(cursorPosition);
          break;
        }
      } else if (following) {
        if (this.checkFollowing(cursorPosition, followingRegex)) {
          this.cursors.push(cursorPosition);
          break;
        }
      } else if (scope) {
        /* comes here only if scope is being checked */
        return true;
      }
    }

    if (this.cursors.length > 0) {
      cursorPositions.splice(index, 1);
      cursorPositions.forEach(value => value.destroy());
      return true;
    }
    return false;
  }
  checkScope(cursorPosition, scope) {
    const editor = atom.workspace.getActiveTextEditor();
    const scopeList = editor.scopeDescriptorForBufferPosition(cursorPosition).getScopesArray();
    const scopeListContainsScope = scopeList.find(tempScope => ~tempScope.search(scope));
    return Boolean(scopeListContainsScope);
  }
  checkProceeding(cursorPosition, precedingRegex = '') {
    const editor = atom.workspace.getActiveTextEditor();
    const precedingText = editor.getTextInBufferRange([[cursorPosition.row, 0], cursorPosition]);
    return Boolean(~precedingText.search(precedingRegex));
  }
  checkFollowing(cursorPosition, followingRegex = '') {
    const editor = atom.workspace.getActiveTextEditor();
    const lineLength = editor.lineTextForBufferRow(cursorPosition.row).length;
    const followingRange = [cursorPosition, [cursorPosition.row, lineLength]];
    const followingText = editor.getTextInBufferRange(followingRange);
    return Boolean(~followingText.search(followingRegex));
  }
  getParser(editor) {
    const scope = editor.getRootScopeDescriptor();
    const matches = /\bsource\.([a-z+\-]+)/.exec(scope);
    const sourceLang = (matches === null) ? null : matches[1];
    const settings = atom.config.get(PACKAGE_SLUG);

    if (sourceLang === 'coffee') return new CoffeeParser(settings);
    return new JavscriptParser(settings);
  }
  parseCommand(inline) {
    const editor = atom.workspace.getActiveTextEditor();
    if (typeof editor === 'undefined' || editor === null) {
      return;
    }
    this.initialize(editor, inline);
    if (this.parser.is_existing_comment(this.line)) {
      this.write(editor, `\n *${this.indentSpaces}`);
      return;
    }
    // erase characters in the view (will be added to the output later)
    this.erase(editor, this.trailing_range);
    // match against a function declaration.
    const out = this.parser.parse(this.line);
    let snippet = this.generateSnippet(out, inline);
    // atom doesnt currently support, snippet end by default
    // so add $0
    if ((snippet.search(/\${0:/) < 0) && (snippet.search(/\$0/) < 0)) {
      snippet += '$0';
    }
    this.write(editor, snippet);
  }
  initialize(editor, inline = false) {
    let cursorPosition = editor.getCursorBufferPosition(); // will handle only one instance
    // Get trailing string
    const lineLength = editor.lineTextForBufferRow(cursorPosition.row).length;
    this.trailing_range = [cursorPosition, [cursorPosition.row, lineLength]];
    this.trailing_string = editor.getTextInBufferRange(this.trailing_range);
    // drop trailing */
    this.trailing_string = this.trailing_string.replace(/\s*\*\/\s*$/, '');
    this.trailing_string = escape(this.trailing_string);

    this.parser = this.get_parser(editor);
    this.parser.inline = inline;

    this.indentSpaces = this.repeat(' ',
      Math.max(0, (this.editor_settings.indentation_spaces || 1))
    );
    this.prefix = '*';

    const settingsAlignTags = this.editor_settings.align_tags || 'deep';
    this.deepAlignTags = settingsAlignTags === 'deep';
    this.shallowAlignTags = ((settingsAlignTags === 'shallow') || (settingsAlignTags === true));

    // use trailing string as a description of the function
    if (this.trailingString) {
      this.parser.setNameOverride(this.trailingString);
    }

    // read the next line
    cursorPosition = cursorPosition.copy();
    cursorPosition.row += 1;
    this.line = this.parser.get_definition(editor, cursorPosition, this.read_line);
  }
  erase(editor, range) {
    const buffer = editor.getBuffer();
    buffer.delete(range);
  }
  write(editor, str) {
    // will insert data at last cursor position
    if (this.snippetsService) {
      this.snippetsService.insertSnippet(str, editor);
    } else {
      atom.notifications.addFatalError('Docblockr: Snippets package disabled.', {
        detail: 'Please enable Snippets package for Docblockr to function properly.',
        dismissable: true,
        icon: 'flame',
      });
      if (self.event) self.event.abortKeyBinding();
    }
  }
  setSnippetsService(service) {
    this.snippetsService = service;
  }
  updateConfig() {
    this.settings = atom.config.get(PACKAGE_SLUG);
  }
  generateSnippet(out, inline) {
    let newOut = out;
    // substitute any variables in the tags
    if (newOut) {
      newOut = this.substitute_variables(out);
    }

    // align the tags
    if (newOut && (this.shallowAlignTags || this.deepAlignTags) && (!inline)) {
      newOut = this.align_tags(newOut);
    }

      // fix all the tab stops so they're consecutive
    if (newOut) {
      newOut = this.fix_tab_stops(newOut);
    }

    if (inline) {
      if (newOut) return (` ${out[0]} */`);
      return (' $0 */');
    }
    return (this.create_snippet(newOut) + (this.editor_settings.newline_after_block ? '\n' : ''));
  }
}
