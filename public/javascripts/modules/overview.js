window.MC = window.MC || {};

window.MC.Overview = (function( $ ) {

  var module = {
    init: function( ) {
      var currentView = { nav: "overview" };
      MC.Settings.write( "currentView", currentView );

      var project = MC.Settings.read( "project" );
      var pid;

      if( project ) {
        pid = project.id || null;
      }

      module.renderOverview( pid );
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
        url: "/project_overview",
        params: {
          id: projectId,
          project: MC.storage.getObj( "project" ) || { }
        },

        done: function( data ) {
          MC.registerSettingsEvents( );

          module.displayCharts( data );
        }
      } );
    },

    displayCharts: function( data ) {
      if( data.commitCats ) {
        MC.Charts.createPieChart( "#commit-cats", data.commitCats );
      } else {
        $( "#commit-cats" ).remove( );
      }

      if( data.bugCats ) {
        MC.Charts.createPieChart( "#bug-cats", data.bugCats );
      } else {
        $( "#bug-cats" ).remove( );
      }

      if( data.linkedCommits ) {
        MC.Charts.createPieChart( "#linked-commits", data.linkedCommits );
      } else {
        $( "#linked-commits" ).remove( );
      }

      if( data.linkedBugs ) {
        MC.Charts.createPieChart( "#linked-bugs", data.linkedBugs );
      } else {
        $( "#linked-bugs" ).remove( );
      }
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
