window.MC = window.MC || {};

window.MC.Overview = (function( $ ) {

  // var _registerEvents = function( ) {
  //   $( "#ovprojects" ).on( "click", "a", function( evt ) {
  //     var projectId = $(this).closest( "li" ).val( );

  //     var text = $(this).html();
  //     var htmlText = text + ' <span class="caret"></span>';
  //     $(this).closest('.dropdown').find('.dropdown-toggle').html(htmlText);

  //     MC.Overview.renderOverview( projectId );
  //   } );

  // };

  var _registerEvents = function( ) {

  };

  var module = {
    init: function( ) {
      var _this = this;

      _registerEvents( );

      module.renderOverview( );
    },

    renderOverview: function( projectId ) {
      if( !projectId ) {
        if( $( "#projects option[selected]" ).length > 0 ) {
          projectId = $( "#projects option[selected]" ).first().val( );
        } else {
          return;
        }
      }

      MC.ajax( {
        url: "/index",
        params: {
          id: projectId
        },

        done: function( data ) {
          MC.Charts.createPieChart( "#commit-cats", data.commitCats );
          MC.Charts.createPieChart( "#bug-cats", data.bugCats );

          MC.Charts.createPieChart( "#linked-commits", data.linkedCommits );
          MC.Charts.createPieChart( "#linked-bugs", data.linkedBugs );

          // $( "#commit-cats" ).html( data.partial );
        }
      } );
    },

    resetView: function( ) {
      $( "#commit-cats" ).empty( );
      $( "#bug-cats" ).empty( );
      $( "#linked-commits" ).empty( );
      $( "#linked-bugs" ).empty( );
    }
  };

  return module;

})(jQuery);
