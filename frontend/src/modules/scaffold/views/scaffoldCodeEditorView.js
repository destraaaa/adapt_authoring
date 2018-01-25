define([ 'core/origin', 'backbone-forms' ], function(Origin, BackboneForms) {

  var ScaffoldCodeEditorView =  Backbone.Form.editors.Base.extend({

    defaultValue: '',

    tagName: 'div',

    className: 'scaffold-code-editor',

    editor: null,

    mode: 'text',

    session: null,

    initialize: function(options) {
      Backbone.Form.editors.Base.prototype.initialize.call(this, options);

      var inputType = options.schema.inputType;
      var mode = inputType.mode || inputType.split(':')[1];

      if (mode) {
        this.mode = mode;
      }
    },

    render: function() {
      this.editor = window.ace.edit(this.$el[0]);
      this.editor.$blockScrolling = Infinity;
      this.editor.setTheme('ace/theme/chrome');
      this.session = this.editor.getSession();
      this.session.setMode('ace/mode/' + this.mode);
      this.setValue(this.value);

      return this;
    },

    setValue: function(value) {
      if (this.mode === 'json') {
        value = value ? JSON.stringify(value, null, '\t') : '{}';
      }

      this.editor.setValue(value);
    },

    getValue: function() {
      var value = this.editor.getValue();

      if (this.mode === 'json' && !this.isSyntaxError()) {
        return value ? JSON.parse(value) : {};
      }

      return value;
    },

    validate: function() {
      var error = Backbone.Form.editors.Base.prototype.validate.call(this);

      if (error) {
        return error;
      }

      if (this.isSyntaxError()) {
        return { message: Origin.l10n.t('app.errorsyntax') };
      }
    },

    isSyntaxError: function() {
      var annotations = this.session.getAnnotations();

      for (var i = 0, j = annotations.length; i < j; i++) {
        if (annotations[i].type === 'error') {
          return true;
        }
      }
    }

  });

  Origin.on('origin:dataReady', function() {
    Origin.scaffold.addCustomField('CodeEditor', ScaffoldCodeEditorView);
    Origin.scaffold.addCustomField('CodeEditor:javascript', ScaffoldCodeEditorView);
    Origin.scaffold.addCustomField('CodeEditor:less', ScaffoldCodeEditorView);
  });

  return ScaffoldCodeEditorView;

});