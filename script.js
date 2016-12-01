var table
  , hash  = getHash()
  , load  = true

  , colormap = {}
  , column= [ 'cmid', 'pmid', 'pre', 'term', 'post', 'wdid', 'ftid' ]
  , desc  = {
    cmid: function (title) {var item;return(
      '<strong>'+title+'</strong> is an object identifier issued by the <a href="http://contentmine.org">ContentMine</a>.'+
      ' It is a' + ('aeiou'.indexOf(
	(item=title.split('.')[1].split(/\d/)[0].split(/(?=[A-Z])/).join(' ').toLowerCase())[0])>-1
      ?'n':'') + ' ' + item +
      ' (<div class="icon-small" style="background:' + getColorNumber( title ) + '"></div>)'
    )}
  , pmid: function (title) {return(
      '<strong>'+title + '</strong> is an article identifier issued by <a href="https://www.ncbi.nlm.nih.gov/pmc/">Pubmed Central</a>. '+
      '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/' + title + '">Here\'s the article</a>'
    )}
  , wdid: function (title) {return(
      '<strong>'+title + '</strong> is an object identifier issued by <a href="https://wikidata.org">Wikidata</a>. '+
      '<a href="https://www.wikidata.org/entity/' + title + '">Here\'s the item</a>'
    )}
  , ftid: function (title) {return(
      '<strong>'+title + '</strong> is a fact identifier issued by the <a href="http://contentmine.org">ContentMine</a>.'
    )}
  }

var apiHost = 'tools.wmflabs.org'

window.onhashchange = checkHash

function getHash () {
  var param = decodeURIComponent( window.location.hash.replace( /^#/, '' ) )
    , parts = param.split( '=' )

  return {
    key: parts[ 0 ],
    val: parts[ 1 ]
  }
}

function clearFilter() {
  $('#desc,#backButton').hide()
  window.location.hash = ''
}

function checkHash() {
  hash = getHash()

  var index
    , value
    , columns = true
    , title   = hash.val||hash.key
    , text

  if ( hash.val ) {
      index = column.indexOf( hash.key )
    , value = hash.val

    if (title&&desc.hasOwnProperty(hash.key)) text = desc[ hash.key ]( title )
  } else if ( hash.key ) {
    if ( /^CM\.[a-z]+([A-Z][a-z]*)*\d*$/.test( hash.key ) ) {
      index = column.indexOf( 'cmid' )
    , value = hash.key

      if ( title ) text = desc[ 'cmid' ]( title )
    } else if ( /^PMC\d+$/.test( hash.key ) ) {
      index = column.indexOf( 'pmid' )
    , value = hash.key

      if ( title ) text = desc[ 'pmid' ]( title )
    } else if ( /^Q\d+$/.test( hash.key ) ) {
      index = column.indexOf( 'wdid' )
    , value = hash.key

      if ( title ) text = desc[ 'wdid' ]( title )
    } else {
      columns = false
      table.columns( 2, 3, 4 ).search( hash.key )
    }
  }

  table
    .search( '' )
    .columns().search( '' )

  if ( columns )
    table.column( index ).search( value )

  if ( title&&text ) {
    $('#desc-title').html(title)
    $('#desc-text').html(text)
    $('#desc,#backButton').show()
  }

  table.draw()
}

function getColorNumber (cmid) {
  var dictionary = cmid.split('.')[1].split(/[0-9]/)[0]
  if (!(dictionary in colormap)) {
    var newColorValue=Math.max(1, ... _.values(colormap))+1
    if (Number.isInteger(newColorValue)) {
      colormap[dictionary] = newColorValue
    }
  }
  return colors[colormap[dictionary]]
}

function loadFile() {
  if (load) {
    var input = document.getElementById('fileinput');
    var file = input.files[0];
    var fr = new FileReader();
    function dummyRemoveXMLFromZDump (file) {
      removeXMLFromZDump(file, receivedText)
    }
    fr.onload = dummyRemoveXMLFromZDump;
    fr.readAsText(file);
  } load = false
}

function loadDefault() {
  if (load) $.get('sample.json', function(file) {
    removeXMLFromZDump(file, receivedText)
  }).fail((err) => {
    var e = {}
    e.target = {}
    e.target.result = err.responseText
    receivedText(e)
  }); load = false
}

function loadDate() {
  var date = document.getElementById('datepicker').value
  $.ajax('http://'+apiHost+'/wikifactmine-api/api/date/'+date, {
    dataType: 'json',
    jsonp: false,
    success: function (data) {
      receivedText(data)
    }
  })
}

function removeXML (str) {
  return str/*.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&?(#x)?.+?;/g,'')*/.replace(
    /^[^<]*>|<.+?>|<[^>]*$/g,
    ' '
  )
}

function removeXMLFromZDump(e, cb) {
  lines = e.target.result.split('\n');
  var newArr = []
  for(var line = 0; line < lines.length; line++){
    try{
      var obj = JSON.parse(lines[line])
      obj.prefix = _.escape( removeXML( obj._source.prefix ) )
      obj.post   = _.escape( removeXML( obj._source.post   ) )
      obj.term   = _.escape(            obj._source.term     )
      obj.identifiers = obj._source.identifiers
      obj.cprojectID = obj._source.cprojectID
      obj.documentID = obj._source.documentID
      newArr.push(obj)
    } catch(err) {

    }
  }
  if(cb) {
    cb(newArr)
  }
  else {
   return newArr
  }
}

function receivedText(newArr) {


  var html = ''

  function contentmineID (cmid) {
    return (
      '<a href="#cmid='+cmid+'">'+
	     '<div class="icon"></div>' +
	      '<span>' + cmid + '</span>' +
        '</a>'
    )
  }

  function factID ( ftid ) {
    return (
      '<a href="#ftid=' + ftid + '">' +
	     '<i class="material-icons">link</i><span style="font-size:0;">' + ftid +
      '</span></a>'
    )
  }

  function wikidataID (wid) {
    if (wid)
      return ( '<a href="#wdid='+wid+'">'+wid+'</a>' )
    else
      return ''
  }

  function prependEnWiki (name) {
    return 'https://en.wikipedia.org/wiki/'+name
  }

  //return the value of the property of the string name if the target is an item
  function returnTargetOfProperty (response, wid, pid, cb) {
    try {
      var target = response.entities[wid].claims[pid][0].mainsnak.datavalue.value.amount
      if(response.entities[wid].claims[pid][0].mainsnak.datatype == "wikibase-item") {

      }
      cb(target)
    }
    catch (err) {}
  }

  function getWikiBaseItem (wid, cb) {
    $.ajax({
      url: wdk.getEntities(wid),
      jsonp: "callback",
      dataType: "jsonp",
      success: cb
    })
  }

  function createdRowFunc (row, data, dataIndex) {
    var color = getColorNumber(data[0])
    $(row).find('td.cmid .icon').css('background-color', color)
    var wid = $(data[5]).text()
    if (wid) {
      getWikiBaseItem(wid, function (response) {
	  var title = response.entities[wid].sitelinks.enwiki.title
	  if (title) {
	    var url = prependEnWiki(title)
	    var html = ` <a href="${url}"><img src="W_icon.png" alt="wikipedia_icon"</a>`//
	    $(row).find('td.term').append(html)

	  }
    try {
      desc = response.entities[wid].descriptions.en.value
    }
    catch (err) {}
    if (desc) {
      $(row).find('td.term').attr('title', desc)
    }
	  returnTargetOfProperty(response, wid, 'P1082', function (target) {
      var population = target.replace('+', '')
      var oldtitle = $(this).attr("title") ? ' ' + $(this).attr("title") : ''
	    if (target) $(row).find('td.term').attr('title', `${oldtitle}Population of: ${population}`).attr('data-toggle', 'tooltip').attr('data-container', 'body')
      $('[data-toggle="tooltip"]').tooltip();
	  })
	})
    }
  }

  $('#front-loading-matter').css('display', 'none')

  $.each(newArr, function(index, value) {
    if(value) {
      value.prefix=_.escape(value.prefix)
      value.post=_.escape(value.post)
      html +=
      '<tr>' +
        '<td class="cmid">'+ contentmineID(value.identifiers.contentmine) +'</td>' +
        '<td class="pmid"><a href="#pmid='+value.cprojectID[0]+'">'+ value.cprojectID[0]+'</td>' +
        '<td class="pre" >' + value.prefix.replace(/(\&|\&amp;)\#x.*?\;/g,'')+'</td>' + //This removes the url encoded text from the snippets
        '<td class="term">'+ value.term+'</td>' +
        '<td class="post">'+ value.post.replace(/(\&|\&amp;)\#x.*?\;/g,'')+'</td>' +
        '<td class="wdid">'+ wikidataID(value.identifiers.wikidata)+'</td>' +
        '<td class="ftid">'+ factID(value._id) +'</td>' +
      '</tr>';
    }
  })
  $('tbody').append(html)

  if ( $.fn.dataTable.isDataTable( '#mytable' ) ) {
    table = $('#mytable').DataTable();
  } else {
    table = $('#mytable').DataTable( {
      ordering  : true
    , order     : [ [ 1, 'asc' ], [ 0, 'asc' ] ]
    , createdRow: createdRowFunc
    , autoWidth : false
    , columnDefs: [
	{ targets: 0, width: '200px' }
      , { targets: 1, width: '110px' }
      , { targets: 3, width: '200px' }
      , { targets: 5, width: '100px' }
      ]
    , search: {
	caseInsensitive: false
      }
    , dom:
	"<'row r-control'<'col-sm-6 c-length'l><'col-sm-6 c-search'f>>" +
	"<'row r-table'<'col-sm-12'tr>>" +
	"<'row r-page'<'col-sm-5 c-info'i><'col-sm-7 c-pagination'p>>"
    } );
  }

  $('#mytable_filter input').on( 'input' , function () {
    window.location.hash = table.search()
  } )

  $('#mytable').css('display', 'table')

  $('#mytable_filter label').append(
    ' <button onclick="clearFilter()">Clear Filter</button>'
  )

  clearFilter()
}
