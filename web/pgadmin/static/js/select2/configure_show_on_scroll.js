import 'select2';
import $ from 'jquery';
import _ from 'underscore';

export default function (options) {
  if(options.showOnScroll) {
    let Utils = $.fn.select2.amd.require('select2/utils');

    /* Define on scroll showing of dropdown items.
     * This also requires ajax option of select2 to be set.
     * The trick is, ajax: {} will also work even if you're actually not
     * using ajax.
     */
    let ScrollDataAdapter = function ($element, dropdownOptions) {
      this.$element = $element;
      this.options = dropdownOptions;
      this._dataToConvert = dropdownOptions.get('data') || [];
    };

    let BaseAdapter = null;
    if(options.data != null) {
      BaseAdapter = $.fn.select2.amd.require('select2/data/array');
    } else {
      BaseAdapter = $.fn.select2.amd.require('select2/data/select');
    }
    Utils.Extend(ScrollDataAdapter, BaseAdapter);

    ScrollDataAdapter.prototype.query = function (params, callback) {
      var data = [];
      var self = this;
      if (!params.page) {
        params.page = 1;
      }
      var pageSize = 20;

      var $options = this.$element.children();
      $options.each(function () {
        var $option = $(this);

        if (!$option.is('option') && !$option.is('optgroup')) {
          return;
        }

        var option = self.item($option);

        var matches = self.matches(params, option);

        if (matches !== null) {
          data.push(matches);
        }
      });

      callback({
        results: data.slice((params.page - 1) * pageSize, params.page * pageSize),
        pagination: {
          more: data.length >= params.page * pageSize,
        },
      });
    };

    if (options.minimumInputLength > 0) {
      ScrollDataAdapter = Utils.Decorate(
        ScrollDataAdapter,
        $.fn.select2.amd.require('select2/data/minimumInputLength')
      );
    }

    if (options.maximumInputLength > 0) {
      ScrollDataAdapter = Utils.Decorate(
        ScrollDataAdapter,
        $.fn.select2.amd.require('select2/data/maximumInputLength')
      );
    }

    if (options.maximumSelectionLength > 0) {
      ScrollDataAdapter = Utils.Decorate(
        ScrollDataAdapter,
        $.fn.select2.amd.require('select2/data/maximumSelectionLength')
      );
    }

    if (options.tags) {
      ScrollDataAdapter = Utils.Decorate(ScrollDataAdapter, $.fn.select2.amd.require('select2/data/tags'));
    }

    if (options.tokenSeparators != null || options.tokenizer != null) {
      ScrollDataAdapter = Utils.Decorate(
        ScrollDataAdapter,
        $.fn.select2.amd.require('select2/data/tokenizer')
      );
    }

    options.dataAdapter = ScrollDataAdapter;

    /* Setting empty ajax option will enable infinite scrolling. */
    if(_.isUndefined(options.ajax)) {
      options.ajax = {};
    }
  }
  return options;
}
