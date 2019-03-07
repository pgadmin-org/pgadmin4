import CodeMirror from 'bundled_codemirror';
import clipboard from 'sources/selection/clipboard';
import moment from 'moment';
import $ from 'jquery';

export default class QueryHistoryDetails {
  constructor(parentNode) {
    this.parentNode = parentNode;
    this.isCopied = false;
    this.timeout = null;
    this.isRendered = false;
    this.sqlFontSize = null;

    this.editorPref = {
      'sql_font_size': '1em',
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

    if(this.query_codemirror) {
      $(this.query_codemirror.getWrapperElement()).css(
        'font-size',this.editorPref.sql_font_size
      );

      this.query_codemirror.refresh();
    }
  }

  parseErrorMessage(message) {
    return message.match(/ERROR:\s*([^\n\r]*)/i)
      ? message.match(/ERROR:\s*([^\n\r]*)/i)[1]
      : message;
  }

  formatDate(date) {
    return moment(date).format('M-D-YY HH:mm:ss');
  }

  copyAllHandler() {
    clipboard.copyTextToClipboard(this.entry.query);

    this.clearPreviousTimeout();

    this.updateCopyButton(true);

    this.timeout = setTimeout(() => {
      this.updateCopyButton(false);
    }, 1500);
  }

  clearPreviousTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  updateCopyButton(copied) {
    if (copied) {
      this.$copyBtn.attr('class', 'was-copied');
      this.$copyBtn.text('Copied!');
    } else {
      this.$copyBtn.attr('class', 'copy-all');
      this.$copyBtn.text('Copy All');
    }
  }

  updateQueryMetaData() {
    let itemTemplate = (data, description) => {
      return `<div class='item'>
                <span class='value'>${data}</span>
                <span class='description'>${description}</span>
            </div>`;
    };

    this.$metaData.empty().append(
      `<div class='metadata'>
                ${itemTemplate(this.formatDate(this.entry.start_time), 'Date')}
                ${itemTemplate(
                  this.entry.row_affected.toLocaleString(),
                  'Rows Affected'
                )}
                ${itemTemplate(this.entry.total_time, 'Duration')}
            </div>`
    );
  }

  updateMessageContent() {
    this.$message_content
      .empty()
      .append(`<pre class='content-value'>${this.entry.message}</pre>`);
  }

  updateErrorMessage() {
    if (!this.entry.status) {
      this.$errMsgBlock.removeClass('d-none');
      this.$errMsgBlock.empty().append(
        `<div class='history-error-text'>
                    <span>Error Message</span> ${this.parseErrorMessage(
                      this.entry.message
                    )}
                </div>`
      );
    } else {
      this.$errMsgBlock.addClass('d-none');
      this.$errMsgBlock.empty();
    }
  }

  selectiveRender() {
    this.updateErrorMessage();
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
            <div class='metadata-block'></div>
            <div class='query-statement-block'>
              <div id='history-detail-query'>
                <button class='' tabindex=0 accesskey='y'></button>
                <div></div>
              </div>
            </div>
            <div>
              <hr class='block-divider'/>
            </div>
            <div class='message-block'>
              <div class='message'>
                <div class='message-header'>Messages</div>
                <div class='content'></div>
              </div>
            </div>
        </div>`
      );

      this.$errMsgBlock = this.parentNode.find('.error-message-block');
      this.$copyBtn = this.parentNode.find('#history-detail-query button');
      this.$copyBtn.off('click').on('click', this.copyAllHandler.bind(this));
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
