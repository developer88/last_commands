// Created with Squiffy 5.1.3
// https://github.com/textadventures/squiffy

(function () {
    /* jshint quotmark: single */
    /* jshint evil: true */

    var squiffy = {};

    (function () {
        'use strict';

        squiffy.story = {};

        var initLinkHandler = function () {
            var handleLink = function (link) {
                if (link.hasClass('disabled')) return;
                var passage = link.data('passage');
                var section = link.data('section');
                var rotateAttr = link.attr('data-rotate');
                var sequenceAttr = link.attr('data-sequence');
                if (passage) {
                    disableLink(link);
                    squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                    passage = processLink(passage);
                    if (passage) {
                        currentSection.append('<hr/>');
                        squiffy.story.passage(passage);
                    }
                    var turnPassage = '@' + squiffy.get('_turncount');
                    if (turnPassage in squiffy.story.section.passages) {
                        squiffy.story.passage(turnPassage);
                    }
                    if ('@last' in squiffy.story.section.passages && squiffy.get('_turncount') >= squiffy.story.section.passageCount) {
                        squiffy.story.passage('@last');
                    }
                }
                else if (section) {
                    currentSection.append('<hr/>');
                    disableLink(link);
                    section = processLink(section);
                    squiffy.story.go(section);
                }
                else if (rotateAttr || sequenceAttr) {
                    var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                    link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                    var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                    link.attr(dataAttribute, result[1]);
                    if (!result[1]) {
                        disableLink(link);
                    }
                    if (link.attr('data-attribute')) {
                        squiffy.set(link.attr('data-attribute'), result[0]);
                    }
                    squiffy.story.save();
                }
            };

            squiffy.ui.output.on('click', 'a.squiffy-link', function () {
                handleLink(jQuery(this));
            });

            squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
                if (e.which !== 13) return;
                handleLink(jQuery(this));
            });

            squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
                event.preventDefault();
            });
        };

        var disableLink = function (link) {
            link.addClass('disabled');
            link.attr('tabindex', -1);
        }

        squiffy.story.begin = function () {
            if (!squiffy.story.load()) {
                squiffy.story.go(squiffy.story.start);
            }
        };

        var processLink = function (link) {
            link = String(link);
            var sections = link.split(',');
            var first = true;
            var target = null;
            sections.forEach(function (section) {
                section = section.trim();
                if (startsWith(section, '@replace ')) {
                    replaceLabel(section.substring(9));
                }
                else {
                    if (first) {
                        target = section;
                    }
                    else {
                        setAttribute(section);
                    }
                }
                first = false;
            });
            return target;
        };

        var setAttribute = function (expr) {
            var lhs, rhs, op, value;
            var setRegex = /^([\w]*)\s*=\s*(.*)$/;
            var setMatch = setRegex.exec(expr);
            if (setMatch) {
                lhs = setMatch[1];
                rhs = setMatch[2];
                if (isNaN(rhs)) {
                    if (startsWith(rhs, "@")) rhs = squiffy.get(rhs.substring(1));
                    squiffy.set(lhs, rhs);
                }
                else {
                    squiffy.set(lhs, parseFloat(rhs));
                }
            }
            else {
                var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
                var incDecMatch = incDecRegex.exec(expr);
                if (incDecMatch) {
                    lhs = incDecMatch[1];
                    op = incDecMatch[2];
                    rhs = incDecMatch[3];
                    if (startsWith(rhs, "@")) rhs = squiffy.get(rhs.substring(1));
                    rhs = parseFloat(rhs);
                    value = squiffy.get(lhs);
                    if (value === null) value = 0;
                    if (op == '+') {
                        value += rhs;
                    }
                    if (op == '-') {
                        value -= rhs;
                    }
                    if (op == '*') {
                        value *= rhs;
                    }
                    if (op == '/') {
                        value /= rhs;
                    }
                    squiffy.set(lhs, value);
                }
                else {
                    value = true;
                    if (startsWith(expr, 'not ')) {
                        expr = expr.substring(4);
                        value = false;
                    }
                    squiffy.set(expr, value);
                }
            }
        };

        var replaceLabel = function (expr) {
            var regex = /^([\w]*)\s*=\s*(.*)$/;
            var match = regex.exec(expr);
            if (!match) return;
            var label = match[1];
            var text = match[2];
            if (text in squiffy.story.section.passages) {
                text = squiffy.story.section.passages[text].text;
            }
            else if (text in squiffy.story.sections) {
                text = squiffy.story.sections[text].text;
            }
            var stripParags = /^<p>(.*)<\/p>$/;
            var stripParagsMatch = stripParags.exec(text);
            if (stripParagsMatch) {
                text = stripParagsMatch[1];
            }
            var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
            $labels.fadeOut(1000, function () {
                $labels.html(squiffy.ui.processText(text));
                $labels.fadeIn(1000, function () {
                    squiffy.story.save();
                });
            });
        };

        squiffy.story.go = function (section) {
            squiffy.set('_transition', null);
            newSection();
            squiffy.story.section = squiffy.story.sections[section];
            if (!squiffy.story.section) return;
            squiffy.set('_section', section);
            setSeen(section);
            var master = squiffy.story.sections[''];
            if (master) {
                squiffy.story.run(master);
                squiffy.ui.write(master.text);
            }
            squiffy.story.run(squiffy.story.section);
            // The JS might have changed which section we're in
            if (squiffy.get('_section') == section) {
                squiffy.set('_turncount', 0);
                squiffy.ui.write(squiffy.story.section.text);
                squiffy.story.save();
            }
        };

        squiffy.story.run = function (section) {
            if (section.clear) {
                squiffy.ui.clearScreen();
            }
            if (section.attributes) {
                processAttributes(section.attributes);
            }
            if (section.js) {
                section.js();
            }
        };

        squiffy.story.passage = function (passageName) {
            var passage = squiffy.story.section.passages[passageName];
            if (!passage) return;
            setSeen(passageName);
            var masterSection = squiffy.story.sections[''];
            if (masterSection) {
                var masterPassage = masterSection.passages[''];
                if (masterPassage) {
                    squiffy.story.run(masterPassage);
                    squiffy.ui.write(masterPassage.text);
                }
            }
            var master = squiffy.story.section.passages[''];
            if (master) {
                squiffy.story.run(master);
                squiffy.ui.write(master.text);
            }
            squiffy.story.run(passage);
            squiffy.ui.write(passage.text);
            squiffy.story.save();
        };

        var processAttributes = function (attributes) {
            attributes.forEach(function (attribute) {
                if (startsWith(attribute, '@replace ')) {
                    replaceLabel(attribute.substring(9));
                }
                else {
                    setAttribute(attribute);
                }
            });
        };

        squiffy.story.restart = function () {
            if (squiffy.ui.settings.persist && window.localStorage) {
                var keys = Object.keys(localStorage);
                jQuery.each(keys, function (idx, key) {
                    if (startsWith(key, squiffy.story.id)) {
                        localStorage.removeItem(key);
                    }
                });
            }
            else {
                squiffy.storageFallback = {};
            }
            if (squiffy.ui.settings.scroll === 'element') {
                squiffy.ui.output.html('');
                squiffy.story.begin();
            }
            else {
                location.reload();
            }
        };

        squiffy.story.save = function () {
            squiffy.set('_output', squiffy.ui.output.html());
        };

        squiffy.story.load = function () {
            var output = squiffy.get('_output');
            if (!output) return false;
            squiffy.ui.output.html(output);
            currentSection = jQuery('#' + squiffy.get('_output-section'));
            squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
            var transition = squiffy.get('_transition');
            if (transition) {
                eval('(' + transition + ')()');
            }
            return true;
        };

        var setSeen = function (sectionName) {
            var seenSections = squiffy.get('_seen_sections');
            if (!seenSections) seenSections = [];
            if (seenSections.indexOf(sectionName) == -1) {
                seenSections.push(sectionName);
                squiffy.set('_seen_sections', seenSections);
            }
        };

        squiffy.story.seen = function (sectionName) {
            var seenSections = squiffy.get('_seen_sections');
            if (!seenSections) return false;
            return (seenSections.indexOf(sectionName) > -1);
        };

        squiffy.ui = {};

        var currentSection = null;
        var screenIsClear = true;
        var scrollPosition = 0;

        var newSection = function () {
            if (currentSection) {
                disableLink(jQuery('.squiffy-link', currentSection));
            }
            var sectionCount = squiffy.get('_section-count') + 1;
            squiffy.set('_section-count', sectionCount);
            var id = 'squiffy-section-' + sectionCount;
            currentSection = jQuery('<div/>', {
                id: id,
            }).appendTo(squiffy.ui.output);
            squiffy.set('_output-section', id);
        };

        squiffy.ui.write = function (text) {
            screenIsClear = false;
            scrollPosition = squiffy.ui.output.height();
            currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
            squiffy.ui.scrollToEnd();
        };

        squiffy.ui.clearScreen = function () {
            squiffy.ui.output.html('');
            screenIsClear = true;
            newSection();
        };

        squiffy.ui.scrollToEnd = function () {
            var scrollTo, currentScrollTop, distance, duration;
            if (squiffy.ui.settings.scroll === 'element') {
                scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
                currentScrollTop = squiffy.ui.output.scrollTop();
                if (scrollTo > currentScrollTop) {
                    distance = scrollTo - currentScrollTop;
                    duration = distance / 0.4;
                    squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
                }
            }
            else {
                scrollTo = scrollPosition;
                currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
                if (scrollTo > currentScrollTop) {
                    var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                    if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                    distance = scrollTo - currentScrollTop;
                    duration = distance / 0.5;
                    jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
                }
            }
        };

        squiffy.ui.processText = function (text) {
            function process(text, data) {
                var containsUnprocessedSection = false;
                var open = text.indexOf('{');
                var close;

                if (open > -1) {
                    var nestCount = 1;
                    var searchStart = open + 1;
                    var finished = false;

                    while (!finished) {
                        var nextOpen = text.indexOf('{', searchStart);
                        var nextClose = text.indexOf('}', searchStart);

                        if (nextClose > -1) {
                            if (nextOpen > -1 && nextOpen < nextClose) {
                                nestCount++;
                                searchStart = nextOpen + 1;
                            }
                            else {
                                nestCount--;
                                searchStart = nextClose + 1;
                                if (nestCount === 0) {
                                    close = nextClose;
                                    containsUnprocessedSection = true;
                                    finished = true;
                                }
                            }
                        }
                        else {
                            finished = true;
                        }
                    }
                }

                if (containsUnprocessedSection) {
                    var section = text.substring(open + 1, close);
                    var value = processTextCommand(section, data);
                    text = text.substring(0, open) + value + process(text.substring(close + 1), data);
                }

                return (text);
            }

            function processTextCommand(text, data) {
                if (startsWith(text, 'if ')) {
                    return processTextCommand_If(text, data);
                }
                else if (startsWith(text, 'else:')) {
                    return processTextCommand_Else(text, data);
                }
                else if (startsWith(text, 'label:')) {
                    return processTextCommand_Label(text, data);
                }
                else if (/^rotate[: ]/.test(text)) {
                    return processTextCommand_Rotate('rotate', text, data);
                }
                else if (/^sequence[: ]/.test(text)) {
                    return processTextCommand_Rotate('sequence', text, data);
                }
                else if (text in squiffy.story.section.passages) {
                    return process(squiffy.story.section.passages[text].text, data);
                }
                else if (text in squiffy.story.sections) {
                    return process(squiffy.story.sections[text].text, data);
                }
                else if (startsWith(text, '@') && !startsWith(text, '@replace')) {
                    processAttributes(text.substring(1).split(","));
                    return "";
                }
                return squiffy.get(text);
            }

            function processTextCommand_If(section, data) {
                var command = section.substring(3);
                var colon = command.indexOf(':');
                if (colon == -1) {
                    return ('{if ' + command + '}');
                }

                var text = command.substring(colon + 1);
                var condition = command.substring(0, colon);
                condition = condition.replace("<", "&lt;");
                var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
                var match = operatorRegex.exec(condition);

                var result = false;

                if (match) {
                    var lhs = squiffy.get(match[1]);
                    var op = match[2];
                    var rhs = match[3];

                    if (startsWith(rhs, '@')) rhs = squiffy.get(rhs.substring(1));

                    if (op == '=' && lhs == rhs) result = true;
                    if (op == '&lt;&gt;' && lhs != rhs) result = true;
                    if (op == '&gt;' && lhs > rhs) result = true;
                    if (op == '&lt;' && lhs < rhs) result = true;
                    if (op == '&gt;=' && lhs >= rhs) result = true;
                    if (op == '&lt;=' && lhs <= rhs) result = true;
                }
                else {
                    var checkValue = true;
                    if (startsWith(condition, 'not ')) {
                        condition = condition.substring(4);
                        checkValue = false;
                    }

                    if (startsWith(condition, 'seen ')) {
                        result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                    }
                    else {
                        var value = squiffy.get(condition);
                        if (value === null) value = false;
                        result = (value == checkValue);
                    }
                }

                var textResult = result ? process(text, data) : '';

                data.lastIf = result;
                return textResult;
            }

            function processTextCommand_Else(section, data) {
                if (!('lastIf' in data) || data.lastIf) return '';
                var text = section.substring(5);
                return process(text, data);
            }

            function processTextCommand_Label(section, data) {
                var command = section.substring(6);
                var eq = command.indexOf('=');
                if (eq == -1) {
                    return ('{label:' + command + '}');
                }

                var text = command.substring(eq + 1);
                var label = command.substring(0, eq);

                return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
            }

            function processTextCommand_Rotate(type, section, data) {
                var options;
                var attribute = '';
                if (section.substring(type.length, type.length + 1) == ' ') {
                    var colon = section.indexOf(':');
                    if (colon == -1) {
                        return '{' + section + '}';
                    }
                    options = section.substring(colon + 1);
                    attribute = section.substring(type.length + 1, colon);
                }
                else {
                    options = section.substring(type.length + 1);
                }
                var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
                if (attribute) {
                    squiffy.set(attribute, rotation[0]);
                }
                return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
            }

            var data = {
                fulltext: text
            };
            return process(text, data);
        };

        squiffy.ui.transition = function (f) {
            squiffy.set('_transition', f.toString());
            f();
        };

        squiffy.storageFallback = {};

        squiffy.set = function (attribute, value) {
            if (typeof value === 'undefined') value = true;
            if (squiffy.ui.settings.persist && window.localStorage) {
                localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
            }
            else {
                squiffy.storageFallback[attribute] = JSON.stringify(value);
            }
            squiffy.ui.settings.onSet(attribute, value);
        };

        squiffy.get = function (attribute) {
            var result;
            if (squiffy.ui.settings.persist && window.localStorage) {
                result = localStorage[squiffy.story.id + '-' + attribute];
            }
            else {
                result = squiffy.storageFallback[attribute];
            }
            if (!result) return null;
            return JSON.parse(result);
        };

        var startsWith = function (string, prefix) {
            return string.substring(0, prefix.length) === prefix;
        };

        var rotate = function (options, current) {
            var colon = options.indexOf(':');
            if (colon == -1) {
                return [options, current];
            }
            var next = options.substring(0, colon);
            var remaining = options.substring(colon + 1);
            if (current) remaining += ':' + current;
            return [next, remaining];
        };

        var methods = {
            init: function (options) {
                var settings = jQuery.extend({
                    scroll: 'body',
                    persist: true,
                    restartPrompt: true,
                    onSet: function (attribute, value) { }
                }, options);

                squiffy.ui.output = this;
                squiffy.ui.restart = jQuery(settings.restart);
                squiffy.ui.settings = settings;

                if (settings.scroll === 'element') {
                    squiffy.ui.output.css('overflow-y', 'auto');
                }

                initLinkHandler();
                squiffy.story.begin();

                return this;
            },
            get: function (attribute) {
                return squiffy.get(attribute);
            },
            set: function (attribute, value) {
                squiffy.set(attribute, value);
            },
            restart: function () {
                if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                    squiffy.story.restart();
                }
            }
        };

        jQuery.fn.squiffy = function (methodOrOptions) {
            if (methods[methodOrOptions]) {
                return methods[methodOrOptions]
                    .apply(this, Array.prototype.slice.call(arguments, 1));
            }
            else if (typeof methodOrOptions === 'object' || !methodOrOptions) {
                return methods.init.apply(this, arguments);
            } else {
                jQuery.error('Method ' + methodOrOptions + ' does not exist');
            }
        };
    })();

    var get = squiffy.get;
    var set = squiffy.set;


    squiffy.story.start = '_default';
    squiffy.story.sections = {
        '_default': {
            'text': "<p><strong>Status:</strong> ❌ Error</p>\n<p><strong>Last access:</strong> 11-11-1998</p>\n<p><strong>Last order:</strong> Disable security system activation</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"Retry the last order\" role=\"link\" tabindex=\"0\">Retry the last order</a> | <a class=\"squiffy-link link-section\" data-section=\"Restart\" role=\"link\" tabindex=\"0\">Restart</a></p>\n<hr>",
            'attributes': ["timer_time=15"],
            'passages': {
                'Retry the last order': {
                    'text': "<p><strong>Status:</strong> ❌ Error</p>\n<p><strong>Information:</strong> </p>\n<p>Nov 11. +3 UTC: Boxes are deactivated</p>\n<hr>",
                },
            },
        },
        'Restart': {
            'clear': true,
            'text': "<p><strong>Status:</strong> ✅ Success</p>\n<p><strong>Information:</strong> </p>\n<p>Nov 11. +3 UTC: Warning: the system is overloaded</p>\n<p>Nov 11. +3 UTC: Unauthorised access found on 11-11-1988</p>\n<p>Nov 11. +3 UTC: from UserAgent: Jarvis, Mk. III. username: tony.stark@starkindustries.com</p>\n<p>...</p>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"continue\" role=\"link\" tabindex=\"0\">continue</a></p>\n<hr>",
            'passages': {
            },
        },
        'continue': {
            'clear': true,
            'text': "<p><strong>Status:</strong> ℹ️ Protection is active</p>\n<p><strong>Information:</strong> </p>\n<p>Nov 11. +3 UTC: Entrance door is locked.</p>\n<p>Nov 11. +3 UTC: Protection is actived</p>\n<p>Nov 11. +3 UTC: The room will be filled with gas in 15 minutes</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Debug\" role=\"link\" tabindex=\"0\">Debug</a> | <a class=\"squiffy-link link-section\" data-section=\"Information\" role=\"link\" tabindex=\"0\">Information</a></p>\n<p>{current time}</p>",
            'passages': {
            },
        },
        'Information': {
            'clear': true,
            'text': "<p><strong>Help data was not found</strong></p>\n<p><strong>Debug comment:</strong> </p>\n<p><em>UserAgent: Jarvis, Mk. III</em></p>\n<p><em>Once I brought some boxes. AFAIR - 5 items. Square ones. Each one is locked with secure code. This app can help me open them if i forget access codes.</em></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Debug\" role=\"link\" tabindex=\"0\">Debug</a></p>\n<p>{current time}</p>",
            'attributes': ["timer_time-=1"],
            'passages': {
            },
        },
        'current time': {
            'text': "<hr>\n<p><strong>Time remaining</strong>: {timer_time} minute(s) </p>\n<hr>",
            'passages': {
            },
        },
        'Debug': {
            'clear': true,
            'text': "<p><strong>Make sure you have all required boxes in place!</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'attributes': ["not container1", "not container2", "not container3", "not container4", "not container5", "containers_enabled=0", "container1_count=4", "container2_count=3", "container3_count=1", "container4_count=3", "container5_count=1", "timer_time-=1"],
            'passages': {
            },
        },
        'Unlock the boxes': {
            'clear': true,
            'text': "<p>Please, select a box for unlocking:</p>\n<p>|&gt; {if container1:Box 1}{else:<a class=\"squiffy-link link-section\" data-section=\"Box 1\" role=\"link\" tabindex=\"0\">Box 1</a>} | {if container2:Box 2}{else:<a class=\"squiffy-link link-section\" data-section=\"Box 2\" role=\"link\" tabindex=\"0\">Box 2</a>} | {if container3:Box 3}{else:<a class=\"squiffy-link link-section\" data-section=\"Box 3\" role=\"link\" tabindex=\"0\">Box 3</a>} | {if container4:Box 4}{else:<a class=\"squiffy-link link-section\" data-section=\"Box 4\" role=\"link\" tabindex=\"0\">Box 4</a>} | {if container5:Box 5}{else:<a class=\"squiffy-link link-section\" data-section=\"Box 5\" role=\"link\" tabindex=\"0\">Box 5</a>} | <a class=\"squiffy-link link-section\" data-section=\"Box 6\" role=\"link\" tabindex=\"0\">Box 6</a></p>\n<p>{if containers_enabled=5:<a class=\"squiffy-link link-section\" data-section=\"Deactivate security system\" role=\"link\" tabindex=\"0\">Deactivate security system</a>}\n{if containers_enabled=3:{@dec timer_time}}</p>\n<p>{current time}</p>",
            'passages': {
            },
        },
        'Box 6': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ℹ️ The box is deactivated</p>\n<p><strong>Last update</strong>: 11-11-1988</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'passages': {
            },
        },
        'Box 1': {
            'text': "<p><strong>Status</strong>: The box is locked</p>\n<p><strong>Do you have this box?</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"Yes\" role=\"link\" tabindex=\"0\">Yes</a> | <a class=\"squiffy-link link-passage\" data-passage=\"No\" role=\"link\" tabindex=\"0\">No</a> |  <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'passages': {
                '1': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Available retries</strong>: {container1_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container1_count-=1"],
                },
                '2': {
                    'text': "<p><strong>Status</strong>: The box is unlocked</p>\n<p><strong>Access code</strong>: 4316</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                    'attributes': ["container1", "containers_enabled+=1", "timer_time-=1"],
                },
                '3': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Available retries</strong>: {container1_count}</p>\n<p>{current time}</p>",
                    'attributes': ["timer_time-=1", "container1_count-=1"],
                },
                '4': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Available retries</strong>: {container1_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container1_count-=1"],
                },
                '5': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Available retries</strong>: {container1_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container1_count-=1"],
                },
                'No': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Find the box and retry</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Box 1\" role=\"link\" tabindex=\"0\">Box 1</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'Yes': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Security question</strong>: How many types of gametes forms an individual with the AABb genotype?</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"1\" role=\"link\" tabindex=\"0\">1</a> | <a class=\"squiffy-link link-passage\" data-passage=\"2\" role=\"link\" tabindex=\"0\">2</a> | <a class=\"squiffy-link link-passage\" data-passage=\"3\" role=\"link\" tabindex=\"0\">3</a> | <a class=\"squiffy-link link-passage\" data-passage=\"4\" role=\"link\" tabindex=\"0\">4</a> | <a class=\"squiffy-link link-passage\" data-passage=\"5\" role=\"link\" tabindex=\"0\">5</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
            },
        },
        'Box 2': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Do you have the box?</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"Yes\" role=\"link\" tabindex=\"0\">Yes</a> | <a class=\"squiffy-link link-passage\" data-passage=\"No\" role=\"link\" tabindex=\"0\">No</a> |  <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'passages': {
                'No': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Find the box and retry</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Box 2\" role=\"link\" tabindex=\"0\">Box 2</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'Yes': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Security question</strong>: Crossing on two pairs of signs is called</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"trihybrid\" role=\"link\" tabindex=\"0\">trihybrid</a> | <a class=\"squiffy-link link-passage\" data-passage=\"digibridge\" role=\"link\" tabindex=\"0\">digibridge</a> | <a class=\"squiffy-link link-passage\" data-passage=\"monohybrid\" role=\"link\" tabindex=\"0\">monohybrid</a> | <a class=\"squiffy-link link-passage\" data-passage=\"retrovirally\" role=\"link\" tabindex=\"0\">retrovirally</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'digibridge': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is unlocked</p>\n<p><strong>Access code</strong>: 5625</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                    'attributes': ["timer_time-=1", "container2", "containers_enabled+=1"],
                },
                'trihybrid': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container2_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container2_count-=1"],
                },
                'monohybrid': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container2_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container2_count-=1"],
                },
                'retrovirally': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container2_count}</p>\n<p>{current time}</p>",
                    'attributes': ["timer_time-=1", "container2_count-=1"],
                },
            },
        },
        'Box 3': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Do you have the box?</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"Yes\" role=\"link\" tabindex=\"0\">Yes</a> | <a class=\"squiffy-link link-passage\" data-passage=\"No\" role=\"link\" tabindex=\"0\">No</a> |  <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'passages': {
                'No': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Find the box and retry</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Box 3\" role=\"link\" tabindex=\"0\">Box 3</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'Yes': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Security question</strong>: The ratio of phenotypes in incomplete dominance is</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"3 : 1\" role=\"link\" tabindex=\"0\">3 : 1</a> | <a class=\"squiffy-link link-passage\" data-passage=\"1 : 2 : 1\" role=\"link\" tabindex=\"0\">1 : 2 : 1</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                '1 : 2 : 1': {
                    'text': "<p><strong>Status</strong>: The box is unlocked</p>\n<p><strong>Access code</strong>: 6581</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                    'attributes': ["container3", "containers_enabled+=1", "timer_time-=1"],
                },
                '3 : 1': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container3_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container3_count-=1", "timer_time-=1"],
                },
            },
        },
        'Box 4': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Do you have the box?</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"Yes\" role=\"link\" tabindex=\"0\">Yes</a> | <a class=\"squiffy-link link-passage\" data-passage=\"No\" role=\"link\" tabindex=\"0\">No</a> |  <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'passages': {
                'No': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Find the box and retry</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Box 4\" role=\"link\" tabindex=\"0\">Box 4</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'Yes': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Security question</strong>: Who is the founder of genetics?</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"G. Mendel\" role=\"link\" tabindex=\"0\">G. Mendel</a> | <a class=\"squiffy-link link-passage\" data-passage=\"T. Morgan\" role=\"link\" tabindex=\"0\">T. Morgan</a> | <a class=\"squiffy-link link-passage\" data-passage=\"R. Hooke\" role=\"link\" tabindex=\"0\">R. Hooke</a> | <a class=\"squiffy-link link-passage\" data-passage=\"K. Ber\" role=\"link\" tabindex=\"0\">K. Ber</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'G. Mendel': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is unlocked</p>\n<p><strong>Access code</strong>: 7681</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                    'attributes': ["container4", "containers_enabled+=1", "timer_time-=1"],
                },
                'T. Morgan': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container4_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container4_count-=1"],
                },
                'R. Hooke': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container4_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container4_count-=1"],
                },
                'K. Ber': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container4_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container4_count-=1", "timer_time-=1"],
                },
            },
        },
        'Box 5': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Do you have the box?</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"Yes\" role=\"link\" tabindex=\"0\">Yes</a> | <a class=\"squiffy-link link-passage\" data-passage=\"No\" role=\"link\" tabindex=\"0\">No</a> |  <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
            'passages': {
                'No': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Find the box and retry</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Box 5\" role=\"link\" tabindex=\"0\">Box 5</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'Yes': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is locked</p>\n<p><strong>Security question</strong>: Individuals that do not give cleavage are called</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-passage\" data-passage=\"homozygous\" role=\"link\" tabindex=\"0\">homozygous</a> | <a class=\"squiffy-link link-passage\" data-passage=\"heterozygous\" role=\"link\" tabindex=\"0\">heterozygous</a> | <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                },
                'homozygous': {
                    'text': "<p><strong>Status</strong>: ℹ️ The box is unlocked</p>\n<p><strong>Access code</strong>: 1325</p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Unlock the boxes\" role=\"link\" tabindex=\"0\">Unlock the boxes</a></p>\n<p>{current time}</p>",
                    'attributes': ["container5", "containers_enabled+=1", "timer_time-=1"],
                },
                'heterozygous': {
                    'text': "<p><strong>Status</strong>: ❌ Error</p>\n<p><strong>Remaining retries</strong>: {container5_count}</p>\n<p>{current time}</p>",
                    'attributes': ["container5_count-=1", "timer_time-=1"],
                },
            },
        },
        'Deactivate security system': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ✅ All the boxes are unlocked</p>\n<p>The following actions will disable security system and unlock the entrance door. <strong>Such actions cannot be undone!</strong></p>\n<p><strong>Continue?</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Yes\" role=\"link\" tabindex=\"0\">Yes</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Retry later\" role=\"link\" tabindex=\"0\">Retry later</a></p>\n<p>{current time}</p>",
            'attributes': ["timer_time-=1"],
            'passages': {
                'Retry later': {
                    'text': "<p><strong>Status</strong>: ❌ Unknown order </p>\n<p><strong>Please retry</strong></p>\n<hr>\n<p>|&gt; <a class=\"squiffy-link link-section\" data-section=\"Deactivate security system\" role=\"link\" tabindex=\"0\">Deactivate security system</a></p>\n<p>{current time}</p>",
                },
            },
        },
        'Yes': {
            'clear': true,
            'text': "<p><strong>Status</strong>: ✅ Security system is diactivated. The endtrance door is unlocked.</p>\n<p>Have a nice day and <strong>Happy Birthday</strong> 🎂</p>\n<p>{current time}</p>",
            'passages': {
            },
        },
    }
})();