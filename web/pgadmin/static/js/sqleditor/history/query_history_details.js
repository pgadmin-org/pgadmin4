import CodeMirror from 'bundled_codemirror';
import clipboard from 'sources/selection/clipboard';
import gettext from 'sources/gettext';
import $ from 'jquery';
import _ from 'underscore';

export default class QueryHistoryDetails {
  constructor(parentNode) {
    this.parentNode = parentNode;
    this.isCopied = false;
    this.timeout = null;
    this.isRendered = false;
    this.sqlFontSize = null;
    this.onCopyToEditorHandler = ()=>{};

    this.editorPref = {
      'sql_font_size': '1em',
      'copy_to_editor': true,
    };
  }

  setEntry(entry) {
    this.entry = entry;
    if (this.isRendered) {
      this.selectiveRender();
    } else {
      this.render();
    }
  }

  setEditorPref(editorPref={}) {
    this.editorPref = {
      ...this.editorPref,
      ...editorPref,
    };

    if(this.query_codemirror && !_.isUndefined(editorPref.sql_font_size)) {
      $(this.query_codemirror.getWrapperElement()).css(
        'font-size',this.editorPref.sql_font_size
      );

      this.query_codemirror.refresh();
    }

    if(this.$copyToEditor && !_.isUndefined(editorPref.copy_to_editor)) {
      if(editorPref.copy_to_editor) {
        this.$copyToEditor.removeClass('d-none');
      } else {
        this.$copyToEditor.addClass('d-none');
      }
    }
  }

  parseErrorMessage(message) {
    return message.match(/ERROR:\s*([^\n\r]*)/i)
      ? message.match(/ERROR:\s*([^\n\r]*)/i)[1]
      : message;
  }

  formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  copyAllHandler() {
    clipboard.copyTextToClipboard(this.entry.query);

    this.clearPreviousTimeout();

    this.updateCopyButton(true);

    this.timeout = setTimeout(() => {
      this.updateCopyButton(false);
    }, 1500);
  }

  onCopyToEditorClick(onCopyToEditorHandler) {
    this.onCopyToEditorHandler = onCopyToEditorHandler;
  }

  clearPreviousTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  updateCopyButton(copied) {
    if (copied) {
      this.$copyBtn.addClass('was-copied').removeClass('copy-all');
      this.$copyBtn.text(gettext('Copied!'));
    } else {
      this.$copyBtn.addClass('copy-all').removeClass('was-copied');
      this.$copyBtn.text(gettext('Copy'));
    }
  }

  updateQueryMetaData() {
    let itemTemplate = (data, description) => {
      if(data)
        return `<div class='item'>
                  <span class='value'>${data}</span>
                  <span class='description'>${description}</span>
              </div>`;
      else
        return '';
    };

    this.$metaData.empty().append(
      '<div class="metadata">' +
      itemTemplate(this.formatDate(this.entry.start_time), gettext('Date')) +
      itemTemplate(
        this.entry.row_affected.toLocaleString(),
        gettext('Rows Affected')
      ) +
      itemTemplate(this.entry.total_time, gettext('Duration')) +
      '</div>'
    );
  }

  updateMessageContent() {
    this.$message_content
      .empty()
      .append(`<pre class='content-value'>${_.escape(this.entry.message)}</pre>`);
  }

  updateErrorMessage() {
    if (!this.entry.status) {
      this.$errMsgBlock.removeClass('d-none');
      this.$errMsgBlock.empty().append(
        `<div class='history-error-text'>
            <span>` + gettext('Error Message') + `</span> ${_.escape(this.parseErrorMessage(this.entry.message))}
        </div>`
      );
    } else {
      this.$errMsgBlock.addClass('d-none');
      this.$errMsgBlock.empty();
    }
  }

  updateInfoMessage() {
    if (this.entry.info) {
      this.$infoMsgBlock.removeClass('d-none');
      this.$infoMsgBlock.empty().append(
        `<div class='history-info-text'>
            ${this.entry.info}
        </div>`
      );
    } else {
      this.$infoMsgBlock.addClass('d-none');
      this.$infoMsgBlock.empty();
    }
  }

  selectiveRender() {
    this.updateErrorMessage();
    this.updateInfoMessage();
    this.updateCopyButton(false);
    this.updateQueryMetaData();
    this.query_codemirror.setValue(this.entry.query);
    this.updateMessageContent();
  }

  render() {
    if (this.entry) {
      this.parentNode.empty().append(
        `<div id='query_detail' class='query-detail'>
            <div class='error-message-block'></div>
            <div class='info-message-block'></div>
            <div class='metadata-block'></div>
            <div class='query-statement-block'>
              <div id='history-detail-query'>
                <button class='btn-copy' tabindex=0 accesskey='y'></button>
                <button class='btn-copy-editor copy-to-editor' tabindex=0 accesskey='y'>` + gettext('Copy to Query Editor') + `</button>
                <div></div>
              </div>
            </div>
            <div>
              <hr class='block-divider'/>
            </div>
            <div class='message-block'>
              <div class='message'>
                <div class='message-header'>` + gettext('Messages') + `</div>
                <div class='content'></div>
              </div>
            </div>
        </div>`
      );

      this.$errMsgBlock = this.parentNode.find('.error-message-block');
      this.$infoMsgBlock = this.parentNode.find('.info-message-block');
      this.$copyBtn = this.parentNode.find('#history-detail-query .btn-copy');
      this.$copyBtn.off('click').on('click', this.copyAllHandler.bind(this));
      this.$copyToEditor = this.parentNode.find('#history-detail-query .btn-copy-editor');
      this.$copyToEditor.off('click').on('click', () => {
        this.onCopyToEditorHandler(this.entry.query);
      });
      this.$copyToEditor.addClass(this.editorPref.copy_to_editor?'':'d-none');
      this.$metaData = this.parentNode.find('.metadata-block');
      this.query_codemirror = CodeMirror(
        this.parentNode.find('#history-detail-query div')[0],
        {
          tabindex: -1,
          mode: 'text/x-pgsql',
          readOnly: true,
        }
      );
      $(this.query_codemirror.getWrapperElement()).css(
        'font-size',this.editorPref.sql_font_size
      );
      this.$message_content = this.parentNode.find('.message-block .content');

      this.isRendered = true;
      this.selectiveRender();
    }
  }
}
