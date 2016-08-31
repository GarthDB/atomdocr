'use babel';

import { Disposable } from 'atom';
import AtomDocr from './atomdocr';

export default {

  config: {
    deep_indent: {
      type: 'boolean',
      default: false
    },
    extend_double_slash: {
      type: 'boolean',
      default: true
    },
    indentation_spaces: {
      type: 'number',
      default: 2
    },
    indentation_spaces_same_para: {
      type: 'number',
      default: 2
    },
    align_tags: {
      type: 'string',
      default: 'no',
      enum: ['no', 'shallow', 'deep']
    },
    extra_tags: {
      type: 'array',
      default: []
    },
    extra_tags_go_after: {
      type: 'boolean',
      default: false
    },
    notation_map: {
      type: 'array',
      default: []
    },
    return_tag: {
      type: 'string',
      default: 'Returns ${1:[type]}'
    },
    return_description: {
      type: 'boolean',
      default: true
    },
    spacer_between_sections: {
      type: 'boolean',
      default: true
    },
    param_description: {
      type: 'boolean',
      default: true
    },
    param_format: {
      type: 'string',
      default: '* `${1:[arg_name]}` ${1:[type]}'
    },
    per_section_indent: {
      type: 'boolean',
      default: false
    },
    min_spaces_between_columns: {
      type: 'number',
      default: 1
    },
    auto_add_method_tag: {
      type: 'boolean',
      default: false
    },
    simple_mode: {
      type: 'boolean',
      default: false
    },
    lower_case_primitives: {
      type: 'boolean',
      default: false
    },
    short_primitives: {
      type: 'boolean',
      default: false
    },
    override_js_var: {
      type: 'boolean',
      default: false
    },
    newline_after_block: {
      type: 'boolean',
      default: false
    },
    development_mode: {
      type: 'boolean',
      default: false
    }
  },

  activate: () => {
    return (this.atomdocr = new AtomDocr());
  },

  consumeSnippetsService: (service) => {
    this.atomdocr.set_snippets_service(service);
    // eslint-disable-next-line no-new
    new Disposable(() => {
      this.atomdocr.set_snippets_service(null);
    });
  },
};
