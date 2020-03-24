import QueryHistoryDetails from './query_history_details';
import { QueryHistoryEntries } from './query_history_entries';
import Split from 'split.js';
import gettext from 'sources/gettext';
import $ from 'jquery';

export default class QueryHistory {
  constructor(parentNode, histModel) {
    this.parentNode = parentNode;
    this.histCollection = histModel;
    this.editorPref = {};

    this.onCopyToEditorHandler = ()=>{};
    this.histCollection.onAdd(this.onAddEntry.bind(this));
    this.histCollection.onReset(this.onResetEntries.bind(this));
  }

  focus() {
    if (this.queryHistEntries) {
      this.queryHistEntries.focus();
    }
  }

  onAddEntry(entry) {
    if (this.histCollection.length() == 1) {
      this.render();
    } else if (this.queryHistEntries) {
      this.queryHistEntries.addEntry(entry);
    }
  }

  onResetEntries() {
    this.isRendered = false;
    this.queryHistEntries = null;
    this.queryHistDetails = null;
    this.render();
  }

  onCopyToEditorClick(onCopyToEditorHandler) {
    this.onCopyToEditorHandler = onCopyToEditorHandler;

    if(this.queryHistDetails) {
      this.queryHistDetails.onCopyToEditorClick(this.onCopyToEditorHandler);
    }
  }

  setEditorPref(editorPref) {
    this.editorPref = {
      ...this.editorPref,
      ...editorPref,
    };
    if(this.queryHistDetails) {
      this.queryHistDetails.setEditorPref(this.editorPref);
    }
  }

  render() {
    if (this.histCollection.length() == 0) {
      this.parentNode.empty()
        .removeClass('d-flex')
        .append(
          '<div role="status" class="pg-panel-message">' +
            gettext('No history found') +
          '</div>'
        );
    } else {
      this.parentNode.empty().addClass('d-flex');
      let $histEntries = $('<div><div>').appendTo(this.parentNode);
      let $histDetails = $('<div><div>').appendTo(this.parentNode);

      Split([$histEntries[0], $histDetails[0]], {
        gutterSize: 1,
        cursor: 'ew-resize',
      });

      this.queryHistDetails = new QueryHistoryDetails($histDetails);
      this.queryHistDetails.setEditorPref(this.editorPref);
      this.queryHistDetails.onCopyToEditorClick(this.onCopyToEditorHandler);
      this.queryHistDetails.render();

      this.queryHistEntries = new QueryHistoryEntries($histEntries);
      this.queryHistEntries.onSelectedChange(
        (entry => {
          this.queryHistDetails.setEntry(entry);
        }).bind(this)
      );
      this.queryHistEntries.render();

      this.histCollection.historyList.map((entry)=>{
        this.queryHistEntries.addEntry(entry);
      });
    }
  }
}
