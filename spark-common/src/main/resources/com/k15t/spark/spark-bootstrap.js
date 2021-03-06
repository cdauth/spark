AJS.toInit(function($) {

    'use strict';


    function AppLoader() {

        var startedApps = {};


        /**
         * Creates an angular based dialog.
         *
         * @param element Dom element under which the angular application should be attached and bootstrapped
         * @param angularAppName Name of the angular application to bootstrap
         * @param appPath application path which will be used to load the necessary angular resources
         * @param callbackStarted Callback which will be called after the angular application was successfully started
         */
        this.createDialog = function(element, angularAppName, appPath, callbackStarted) {

            // append trailing slash if not there.
            var fullAppPath = contextPath + (/\/$/.test(appPath) ? appPath : appPath + '/');

            var elementIdSparkAppContainer = angularAppName + '-dialog-container';
            var appContainerAlreadyCreated = $('#' + elementIdSparkAppContainer).length > 0;

            if (appContainerAlreadyCreated) {
                $('#' + elementIdSparkAppContainer).remove();
            }

            $(element).append(SPARK.Common.Templates.appBootstrapContainer({
                containerId: elementIdSparkAppContainer
            }));

            // We have to use an additional element (div#spark-dialog-app-wrapper),
            // because body doesn't work, because it is using the browsers .innerHtml
            // property, which doesn't work consistently across browsers and for
            // example in Chrome includes elements from head, too. The additional
            // element is inserted automatically by the AppServlet.
            // More info: https://api.jquery.com/load/#loading-page-fragments
            $('#' + elementIdSparkAppContainer, element).load(
                fullAppPath + ' div#spark-dialog-app-wrapper > *', function complete(response, status, xhr) {

                    if (status == "error") {
                        var dialog = createErrorDialog(angularAppName);
                        var absoluteAppPath = location.protocol + '//' + location.host + fullAppPath;
                        dialog.$titleEl.html('Error');
                        dialog.$contentEl.html(
                            '<h2>Could not load dialog app from \'' + fullAppPath + '\'</h2>' +
                            '<p>Have you created a servlet module for the DialogAppServlet in <code>atlassian-plugin.xml</code>?</p>' +
                            '<p>It should be available at <a href="' + fullAppPath + '">' + absoluteAppPath + '</a></p>'
                        );
                        dialog.show();

                        AJS.$('#closeErrorDialogButton').click(function(e) {
                            e.preventDefault();
                            dialog.hide();
                        });

                    } else {

                        var angular = (window.angular = {});

                        if (startedApps[angularAppName]) {
                            delete startedApps[angularAppName];
                        }

                        // https://github.com/rgrove/lazyload
                        LazyLoad.js(getExtractScriptsFromElement(element), function() {
                            angular = window.angular;
                            startedApps[angularAppName] = angular.bootstrap($('#' + angularAppName, element), [angularAppName]);
                            if (callbackStarted) {
                                callbackStarted(angular);
                            }
                        });

                    }
                });
        };

        /**
         * Gets the bootstrapped angular application
         *
         * @param angularAppName Name of the angular application
         * @returns {*} Angular application or undefined if there is no application registered with that name
         */
        this.getApp = function(angularAppName) {
            return startedApps[angularAppName];
        };

        var createErrorDialog = function(dialogId) {

            var dialog;

            if (AJS.dialog2) {
                $('body').append(SPARK.Common.Templates.errorDialog2({
                    dialogId: dialogId
                }));
                dialog = AJS.dialog2('#' + dialogId);
                dialog.$appEl = dialog.$el;
                dialog.$titleEl = $('h2:contains({{app.title}})', dialog.$appEl);
                dialog.$contentEl = $('.spark-app-content', dialog.$appEl);

            } else {
                dialog = new AJS.Dialog({
                    width: 800,
                    height: 500,
                    id: dialogId
                });
                dialog.$appEl = dialog.popup.element;
                dialog.$appEl.html(SPARK.Common.Templates.errorDialog());
                dialog.$titleEl = $('h2:contains({{app.title}})', dialog.$appEl);
                dialog.$contentEl = $('.spark-app-content', dialog.$appEl);
                dialog.$contentEl.height(dialog.$appEl.height() - 105);
            }

            $('.aui-blanket').addClass('spark-loading');

            return dialog;
        };


        var getExtractScriptsFromElement = function($contentEl) {

            var scripts = [];

            $('meta[name=script]', $contentEl).each(function() {
                scripts.push($(this).attr('content'));
                $(this).remove();
            });

            return scripts;
        };
    }

    // init SPARK context ==================================================================

    if(window.SPARK === undefined) {
        window.SPARK = {};
    }

    if (window.SPARK.appLoader === undefined) {
        window.SPARK.appLoader = new AppLoader();
    }

})(AJS.$);