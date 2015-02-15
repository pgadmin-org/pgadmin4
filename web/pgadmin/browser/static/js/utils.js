function report_error(message, info) {

    text = '<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">\
  <div class="panel panel-default">\
    <div class="panel-heading" role="tab" id="headingOne">\
      <h4 class="panel-title">\
        <a data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">\
          Error message\
        </a>\
      </h4>\
    </div>\
    <div id="collapseOne" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="headingOne">\
      <div class="panel-body" style="overflow: scroll;">' + message + '</div>\
    </div>\
  </div>'
  
    if (info != '') {
        text += '<div class="panel panel-default">\
    <div class="panel-heading" role="tab" id="headingTwo">\
      <h4 class="panel-title">\
        <a class="collapsed" data-toggle="collapse" data-parent="#accordion" href="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">\
          Additional info\
        </a>\
      </h4>\
    </div>\
    <div id="collapseTwo" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingTwo">\
      <div class="panel-body" style="overflow: scroll;">' + info + '</div>\
    </div>\
  </div>\
</div>'
    }
    
    text += '</div>'
    
    alertify.alert(
        'An error has occurred',
        text
    )   
}