/*!
 * Feature Carousel, Version 1.0
 * http://www.bkosolutions.com
 *
 * Copyright 2010 Brian Osborne
 * Licensed under GPL version 3
 *
 * http://www.gnu.org/licenses/gpl.txt
 */
(function($) {

    $.fn.featureCarousel = function (options) {

        // override the default options with user defined options
        options = $.extend({}, $.fn.featureCarousel.defaults, options || {});

        return $(this).each(function () {

            /* These are univeral values that are used throughout the plugin. Do not modify them
             * unless you know what you're doing. Most of them feed off the options
             * so most customization can be achieved by modifying the options values */
            var pluginData = {
                currentCenterNum:       options.startingFeature,
                containerWidth:         0,
                containerHeight:        0,
                largeFeatureWidth:      0,
                largeFeatureHeight:     0,
                smallFeatureWidth:      0,
                smallFeatureHeight:     0,
                totalFeatureCount:      $(this).children("div").length,
                currentlyMoving:        false,
                featuresContainer:      $(this),
                featuresArray:          [],
                containerIDTag:         "#"+$(this).attr("id"),
                timeoutVar:             null,
                rotationsRemaining:     0,
                itemsToAnimate:         0,
                borderWidth:			0
            };

            preload(function () {
            	setupFeatureDimensions();
                setupCarousel();
                setupFeaturePositions();
                setupBlips();
                initiateMove(true,1);
            });

            /**
             * Function to preload the images in the carousel if desired.
             * This is not recommended if there are a lot of images in the carousel because
             * it may take a while. Functionality does not depend on preloading the images
             */
            function preload(callback) {
                // user may not want to preload images
                if (options.preload == true) {
                    var $imageElements = pluginData.featuresContainer.find("img");
                    var loadedImages = 0;
                    var totalImages = $imageElements.length;

                    $imageElements.each(function () {
                        // Attempt to load the images
                        $(this).load(function () {
                            // Add to number of images loaded and see if they are all done yet
                            loadedImages++;
                            if (loadedImages == totalImages) {
                                // All done, perform callback
                                callback();
                            }
                        });
                        // The images may already be cached in the browser, in which case they
                        // would have a 'true' complete value and the load callback would never be
                        // fired. This will fire it manually.
                        if (this.complete) {
                            $(this).trigger('load');
                        }
                    });
                } else {
                    // if user doesn't want preloader, then just go right to callback
                    callback();
                }
            }

            // Gets the feature container based on the number
            function getContainer(featureNum) {
                return pluginData.featuresArray[featureNum-1];
            }

            // get a feature given it's set position (the position that doesn't change)
            function getBySetPos(position) {
                $.each(pluginData.featuresArray, function () {
                    if ($(this).data().setPosition == position)
                        return $(this);
                });
            }

            // get previous feature number
            function getPreviousNum(num) {
                if ((num - 1) == 0) {
                    return pluginData.totalFeatureCount;
                } else {
                    return num - 1;
                }
            }

            // get next feature number
            function getNextNum(num) {
                if ((num + 1) > pluginData.totalFeatureCount) {
                    return 1;
                } else {
                    return num + 1;
                }
            }

            /**
             * Because there are several options the user can set for the width and height
             * of the feature images, this function is used to determine which options were set
             * and to set the appropriate dimensions used for a small and large feature
             */
            function setupFeatureDimensions() {
                // Set the height and width of the entire carousel container
                pluginData.containerWidth = pluginData.featuresContainer.width();
                pluginData.containerHeight = pluginData.featuresContainer.height();

                // Grab the first image for reference
                var $firstFeatureImage = $(pluginData.containerIDTag).find("div img:first");

                // Large Feature Width
                if (options.largeFeatureWidth > 1)
                    pluginData.largeFeatureWidth = options.largeFeatureWidth;
                else if (options.largeFeatureWidth > 0 && options.largeFeatureWidth < 1)
                    pluginData.largeFeatureWidth = $firstFeatureImage.width() * options.largeFeatureWidth;
                else
                    pluginData.largeFeatureWidth = $firstFeatureImage.outerWidth();
                // Large Feature Height
                if (options.largeFeatureHeight > 1)
                    pluginData.largeFeatureHeight = options.largeFeatureHeight;
                else if (options.largeFeatureHeight > 0 && options.largeFeatureHeight < 1)
                    pluginData.largeFeatureHeight = $firstFeatureImage.height() * options.largeFeatureHeight;
                else
                    pluginData.largeFeatureHeight = $firstFeatureImage.outerHeight();
                // Small Feature Width
                if (options.smallFeatureWidth > 1)
                    pluginData.smallFeatureWidth = options.smallFeatureWidth;
                else if (options.smallFeatureWidth > 0 && options.smallFeatureWidth < 1)
                    pluginData.smallFeatureWidth = $firstFeatureImage.width() * options.smallFeatureWidth;
                else
                    pluginData.smallFeatureWidth = $firstFeatureImage.outerWidth() / 2;
                // Small Feature Height
                if (options.smallFeatureHeight > 1)
                    pluginData.smallFeatureHeight = options.smallFeatureHeight;
                else if (options.smallFeatureHeight > 0 && options.smallFeatureHeight < 1)
                    pluginData.smallFeatureHeight = $firstFeatureImage.height() * options.smallFeatureHeight;
                else
                    pluginData.smallFeatureHeight = $firstFeatureImage.outerHeight() / 2;
            }

            /**
             * Function to take care of setting up various aspects of the carousel,
             * most importantly the default positions for the features
             */
            function setupCarousel() {
                // Set the total feature count to the amount the user wanted to cutoff
                if (options.displayCutoff > 0 && options.displayCutoff < pluginData.totalFeatureCount) {
                    pluginData.totalFeatureCount = options.displayCutoff;
                }

                // fill in the features array
                pluginData.featuresContainer.children("div").each(function (index) {
                    if (index < pluginData.totalFeatureCount) {
                        pluginData.featuresArray[index] = $(this);
                    }
                });

                // Determine the total border width around the feature if there is one
                if (pluginData.featuresContainer.children("div").first().css("borderLeftWidth") != "medium") {
                    pluginData.borderWidth = parseInt(pluginData.featuresContainer.children("div").first().css("borderLeftWidth"))*2;
                }

                // Place all the features in a center hidden position to start off
                pluginData.featuresContainer
                    // Have to make the container relative positioning
                    .children("div").each(function () {
                        // Center all the features in the middle and hide them
                        $(this).css({
                            'left': (pluginData.containerWidth / 2) - (pluginData.smallFeatureWidth / 2) - (pluginData.borderWidth / 2),
                            'width': pluginData.smallFeatureWidth,
                            'height': pluginData.smallFeatureHeight,
                            'top': options.smallFeatureOffset + options.topPadding,
                            'opacity': 0
                        });
                    })
                    // Set all the images to small feature size
                    .find("img:first").css({
                        'width': pluginData.smallFeatureWidth
                    });

                // figure out number of items that will rotate each time
                if (pluginData.totalFeatureCount < 4) {
                    pluginData.itemsToAnimate = pluginData.totalFeatureCount;
                } else {
                    pluginData.itemsToAnimate = 4;
                }

                // Hide story info and set the proper positioning
                pluginData.featuresContainer.find("div > div")
                    .hide();
            }

            /**
             * Here all the position data is set for the features.
             * This is an important part of the carousel to keep track of where
             * each feature within the carousel is
             */
            function setupFeaturePositions() {
                // give all features a set number that won't change so they remember their
                // original order
                $.each(pluginData.featuresArray, function (i) {
                    $(this).data('setPosition',i+1);
                });

                // Go back one - This is done because we call the move function right away, which
                // shifts everything to the right. So we set the current center back one, so that
                // it displays in the center when that happens
                var oneBeforeStarting = getPreviousNum(options.startingFeature);
                pluginData.currentCenterNum = oneBeforeStarting;

                // Center feature will be position 1
                var $centerFeature = getContainer(oneBeforeStarting);
                $centerFeature.data('position',1);

                // Everything before that center feature...
                var $prevFeatures = $centerFeature.prevAll();
                $prevFeatures.each(function (i) {
                    $(this).data('position',(pluginData.totalFeatureCount - i));
                });

                // And everything after that center feature...
                var $nextFeatures = $centerFeature.nextAll();
                $nextFeatures.each(function (i) {
                    if ($(this).data('setPosition') != undefined) {
                        $(this).data('position',(i + 2));
                    }
                });

                // if the counter style is for including number tags in description...
                if (options.counterStyle == 3) {
                    $.each(pluginData.featuresArray, function () {
                        var pos = getPreviousNum($(this).data('position'));
                        var $numberTag = $("<span></span>");
                        $numberTag.addClass("numberTag");
                        $numberTag.html("("+ pos + " of " + pluginData.totalFeatureCount + ") ");
                        $(this).find('div p').prepend($numberTag);
                    });
                }
            }

            /**
             * The blips are built using this function. The position and look
             * of the blips are completely determined by the CSS file
             */
            function setupBlips()
            {
                // Only setup the blips if the counter style is 1 or 2
                if (options.counterStyle == 1 || options.counterStyle == 2) {
                    // construct the blip list
                    var $list = $("<ul></ul>");
                    $list.addClass("blipsContainer");
                    for (var i = 0; i < pluginData.totalFeatureCount; i++) {
                        // Counter style 1 has no numbers, while 2 does
                        var counter;
                        if (options.counterStyle == 2)
                            counter = "";
                        else
                            counter = i+1;

                        // Build the DOM for the blip list
                        var $blip = $("<div>"+counter+"</div>");
                        $blip.addClass("blip");
                        $blip.css("cursor","pointer");
                        $blip.attr("id","blip_"+(i+1));
                        var $listEntry = $("<li></li>");
                        $listEntry.append($blip);
                        $listEntry.css("float","left");
                        $listEntry.css("list-style-type","none");
                        $list.append($listEntry);
                    }
                    // add the blip list and then make sure it's visible
                    $(pluginData.containerIDTag).append($list);
                    $list.hide().show();
                }
            }

            // Move the highlighted blip to the currently centered feature
            function changeBlip(oldCenter, newCenter)
            {
                // get selectors for the two blips
                var $blipsContainer = pluginData.featuresContainer.find(".blipsContainer");
                var $oldCenter = $blipsContainer.find("#blip_"+oldCenter);
                var $newCenter = $blipsContainer.find("#blip_"+newCenter);

                // change classes
                $oldCenter.removeClass("blipSelected");
                $newCenter.addClass("blipSelected");
            }

            /**
             * This function will set the autoplay for the carousel to
             * automatically rotate it given the time in the options
             */
            function autoPlay() {
                // clear the timeout var if it exists
                if (pluginData.timeoutVar != null) {
                    pluginData.timeoutVar = clearTimeout(pluginData.timeoutVar);
                }

                // set interval for moving if autoplay is set
                if (options.autoPlay != 0) {
                    var autoTime = (Math.abs(options.autoPlay) < options.carouselSpeed) ? options.carouselSpeed : Math.abs(options.autoPlay);
                    pluginData.timeoutVar = setTimeout(function () {
                        if (options.autoPlay > 0)
                            initiateMove(true,1);
                        else if (options.autoPlay < 0)
                            initiateMove(false,1);
                    }, autoTime);
                }
            }

            // This is a helper function for the animateFeature function that
            // will update the positions of all the features based on the direction
            function rotatePositions(direction) {
                $.each(pluginData.featuresArray, function () {
                    var newPos;
                    if (direction == false) {
                        newPos = getNextNum($(this).data().position);
                    } else {
                        newPos = getPreviousNum($(this).data().position);
                    }
                    $(this).data('position',newPos);
                });
            }

            /**
             * This function is used to animate the given feature to the given
             * location. Valid locations are "left", "right", "center", "hidden"
             */
            function animateFeature($feature, direction)
            {
                var new_width, new_height, new_top, new_left, new_zindex, new_padding, new_fade;

                // Determine the old and new positions of the feature
                var oldPosition = $feature.data('position');
                var newPosition;
                if (direction == true)
                    newPosition = getPreviousNum(oldPosition);
                else
                    newPosition = getNextNum(oldPosition);

                // Caculate new new css values depending on where the feature will be located
                if (newPosition == 1) {
                    new_width = pluginData.largeFeatureWidth;
                    new_height = pluginData.largeFeatureHeight;
                    new_top = options.topPadding;
                    new_zindex = $feature.css("z-index");
                    new_left = (pluginData.containerWidth / 2) - (pluginData.largeFeatureWidth / 2) - (pluginData.borderWidth / 2);
                    new_fade = 1.0;
                } else {
                    new_width = pluginData.smallFeatureWidth;
                    new_height = pluginData.smallFeatureHeight;
                    new_top = options.smallFeatureOffset + options.topPadding;
                    new_zindex = 1;
                    new_fade = 0.4;
                    // some info is different for the left, right, and hidden positions
                    // left
                    if (newPosition == pluginData.totalFeatureCount) {
                        new_left = options.sidePadding;
                    // right
                    } else if (newPosition == 2) {
                        new_left = pluginData.containerWidth - pluginData.smallFeatureWidth - options.sidePadding - pluginData.borderWidth;
                    // hidden
                    } else {
                        new_left = (pluginData.containerWidth / 2) - (pluginData.smallFeatureWidth / 2) - (pluginData.borderWidth / 2);
                        new_fade = 0;
                    }
                }
                // This code block takes care of hiding the feature information if the feature is
                // NO LONGER going to be in the center
                if (newPosition != 1) {
                    // Slide up the story information
                    $feature.find("div")
                        .hide();
                }

                // Animate the feature div to its new location
                $feature
                    .animate(
                        {
                            width: new_width,
                            height: new_height,
                            top: new_top,
                            left: new_left,
                            opacity: new_fade
                        },
                        options.carouselSpeed,
                        options.animationEasing,
                        function () {
                            // Take feature info out of hiding if new position is center
                            if (newPosition == 1) {
                                // fade in the feature information
                                $feature.find("div")
                                    .fadeTo("fast",0.85);
                            }
                            // decrement the animation queue
                            pluginData.rotationsRemaining = pluginData.rotationsRemaining - 1;
                            // have to change the z-index after the animation is done
                            $feature.css("z-index", new_zindex);
                            // change blips if using them
                            if (options.counterStyle == 1 || options.counterStyle == 2) {
                                if (newPosition == 1) {
                                    // figure out what item was just in the center, and what item is now in the center
                                    var newCenterItemNum = pluginData.featuresContainer.children("div").index($feature) + 1;
                                    var oldCenterItemNum;
                                    if (direction == false)
                                        oldCenterItemNum = getNextNum(newCenterItemNum);
                                    else
                                        oldCenterItemNum = getPreviousNum(newCenterItemNum);
                                    // now change the active blip
                                    changeBlip(oldCenterItemNum, newCenterItemNum);
                                }
                            }

                            // did all the the animations finish yet?
                            var divide = pluginData.rotationsRemaining / pluginData.itemsToAnimate;
                            if (divide % 1 == 0) {
                                // if so, set moving to false...
                                pluginData.currentlyMoving = false;
                                // change positions for all items...
                                rotatePositions(direction);

                                // and move carousel again if queue is not empty
                                if (pluginData.rotationsRemaining > 0)
                                    move(direction);
                            }

                            // call autoplay again
                            autoPlay();
                        }
                    )
                    // select the image within the feature
                    .find("img:first")
                        // animate its size down
                        .animate({
                            width: new_width,
                            height: new_height
                        },
                        options.carouselSpeed,
                        options.animationEasing)
                    .end();
            }

            /**
             * move the carousel to the left or to the right. The features that
             * will move into the four positions are calculated and then animated
             * rotate to the RIGHT when direction is TRUE and
             * rotate to the LEFT when direction is FALSE
             */
            function move(direction)
            {
                // Set the carousel to currently moving
                pluginData.currentlyMoving = true;

                // Obtain the new feature positions based on the direction that the carousel is moving
                var $newCenter, $newLeft, $newRight, $newHidden;
                if (direction == true) {
                    // Shift features to the left
                    $newCenter = getContainer(getNextNum(pluginData.currentCenterNum));
                    $newLeft = getContainer(pluginData.currentCenterNum);
                    $newRight = getContainer(getNextNum(getNextNum(pluginData.currentCenterNum)));
                    $newHidden = getContainer(getPreviousNum(pluginData.currentCenterNum));
                    pluginData.currentCenterNum = getNextNum(pluginData.currentCenterNum);
                } else {
                    $newCenter = getContainer(getPreviousNum(pluginData.currentCenterNum));
                    $newLeft = getContainer(getPreviousNum(getPreviousNum(pluginData.currentCenterNum)));
                    $newRight = getContainer(pluginData.currentCenterNum);
                    $newHidden = getContainer(getNextNum(pluginData.currentCenterNum));
                    pluginData.currentCenterNum = getPreviousNum(pluginData.currentCenterNum);
                }

                // The z-index must be set before animations take place for certain movements
                // this makes the animations look nicer
                if (direction) {
                    $newLeft.css("z-index", 3);
                } else {
                    $newRight.css("z-index", 3);
                }
                $newCenter.css("z-index", 4);

                // Animate the features into their new positions
                animateFeature($newLeft, direction);
                animateFeature($newCenter, direction);
                animateFeature($newRight, direction);
                // Only want to animate the "hidden" feature if there are more than three
                if (pluginData.totalFeatureCount > 3) {
                    animateFeature($newHidden, direction);
                }
            }

            // This is used to relegate carousel movement throughout the plugin
            // It will only initiate a move if the carousel isn't currently moving
            // It will set the animation queue to the number of rotations given
            function initiateMove(direction, rotations) {
                if (pluginData.currentlyMoving == false) {
                    var queue = rotations * pluginData.itemsToAnimate;
                    pluginData.rotationsRemaining = queue;
                    move(direction);
                }
            }

            /**
             * This will find the shortest distance to travel the carousel from
             * one position to another position. It will return the shortest distance
             * in number form, and will be positive to go to the right and negative for left
             */
            function findShortestDistance(from, to) {
                var goingToLeft = 1, goingToRight = 1, tracker;
                tracker = from;
                // see how long it takes to go to the left
                while ((tracker = getPreviousNum(tracker)) != to) {
                    goingToLeft++;
                }

                tracker = from;
                // see how long it takes to to to the right
                while ((tracker = getNextNum(tracker)) != to) {
                    goingToRight++;
                }

                // whichever is shorter
                return (goingToLeft < goingToRight) ? goingToLeft*-1 : goingToRight;
            }

            // Move to the left if left button clicked
            $(".leftButton").click(function () {
                initiateMove(false,1);
            });

            // Move to right if right button clicked
            $(".rightButton").click(function () {
                initiateMove(true,1);
            });

            // These are the click and hover events for the features
            pluginData.featuresContainer.children("div")
                .click(function () {
                    var position = $(this).data('position');
                    if (position == 2) {
                        initiateMove(true,1);
                    } else if (position == pluginData.totalFeatureCount) {
                        initiateMove(false,1);
                    }
                })
                .mouseover(function () {
                    if (pluginData.currentlyMoving == false) {
                        var position = $(this).data('position');
                        if (position == 2 || position == pluginData.totalFeatureCount) {
                            $(this).css("opacity",0.8);
                        }
                    }
                })
                .mouseout(function () {
                    if (pluginData.currentlyMoving == false) {
                        var position = $(this).data('position');
                        if (position == 2 || position == pluginData.totalFeatureCount) {
                            $(this).css("opacity",0.4);
                        }
                    }
                });

            // Add event listener to all clicks within the features container
            // This is done to disable any links that aren't within the center feature
            $("a", pluginData.containerIDTag).live("click", function (event) {
                // travel up to the container
                var $parents = $(this).parentsUntil(pluginData.containerIDTag);
                // now check each of the feature divs within it
                $parents.each(function () {
                    var position = $(this).data('position');
                    // if there are more than just feature divs within the container, they will
                    // not have a position and it may come back as undefined. Throw these out
                    if (position != undefined) {
                        // if any of the links on a feature OTHER THAN the center feature were clicked,
                        // initiate a carousel move but then throw the link action away
                        // if the position WAS the center (i.e. 1), then do nothing and let the link pass
                        if (position != 1) {
                            if (position == pluginData.totalFeatureCount) {
                                initiateMove(false,1);
                            } else if (position == 2) {
                                initiateMove(true,1);
                            }
                            event.preventDefault();
                            return false;
                        }
                    }
                });
            });

            $(".blip").live("click",function () {
                // grab the position # that was clicked
                var goTo = $(this).attr("id").substring(5);
                // find out where that feature # actually is in the carousel right now
                var whereIsIt = pluginData.featuresContainer.children("div").eq(goTo-1).data('position');
                // which feature # is currently in the center
                var currentlyAt = pluginData.currentCenterNum;
                // if the blip was clicked for the current center feature, do nothing
                if (goTo != currentlyAt) {
                    // find the shortest distance to move the carousel
                    var shortest = findShortestDistance(1, whereIsIt);
                    // initiate a move in that direction with given number of rotations
                    if (shortest < 0) {
                        initiateMove(false,(shortest*-1));
                    } else {
                        initiateMove(true,shortest);
                    }
                }

            });
        });
    };

    $.fn.featureCarousel.defaults = {
        // If zero, take original width and height of image
        // If between 0 and 1, multiply by original width and height (to get smaller size)
        // If greater than one, use in place of original pixel dimensions
        largeFeatureWidth :     0,
        largeFeatureHeight:		0,
        smallFeatureWidth:      .5,
        smallFeatureHeight:		.5,
        // how much to pad the top of the carousel
        topPadding:             20,
        // spacing between the sides of the container (pixels)
        sidePadding:            30,
        // the additional offset to pad the side features from the top of the carousel
        smallFeatureOffset:		50,
        // indicates which feature to start the carousel at
        startingFeature:        1,
        // speed in milliseconds it takes to rotate the carousel
        carouselSpeed:          1000,
        // time in milliseconds to set interval to autorotate the carousel
        // set to zero to disable it, negative to go left
        autoPlay:               0,
        // set to true to enable the creation of blips to indicate how many
        // features there are
        counterStyle:           1,
        // true to preload all images in the carousel before displaying anything
        preload:                true,
        // Will only display this many features in the carousel
        // set to zero to disable
        displayCutoff:          0,
        // an easing can be specified for the animation of the carousel
        animationEasing:        'swing'
    };

})(jQuery);