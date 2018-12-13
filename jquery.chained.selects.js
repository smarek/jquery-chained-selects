(function ($) {
    return $.fn.chainedSelects = function (options) {
        // constants
        var attr_chain_id = 'chain-id', attr_level_id = 'level-id', attr_data = 'next-level-data',
            attr_selected_option = 'selected-option',
            attr_value_select_class = 'chained-select';
        // callable variables
        var log, getLevel, hideLevelsGreaterThan, levelChangedCallback, randomString, generateSID, fillLevelData,
            findPathForKey, openDefaultPath, runUserCallback;
        // data variables
        var levels = [];
        randomString = function (length, chars) {
            var result = '';
            for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
            return result;
        };
        generateSID = function () {
            return randomString(8, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        };
        log = function (data) {
            if (options.loggingEnabled && console !== undefined) {
                console.log("[ChainedSelects] " + data);
            }
        };
        runUserCallback = function (data) {
            try {
                if (options.onSelectedCallback !== false) {
                    options.onSelectedCallback(data);
                }
            } catch (e) {
                log(e);
            }
        };
        levelChangedCallback = function (levelSelect) {
            var currentSelectedValue = levelSelect.find(':selected').data(attr_data);
            var currentSID = levelSelect.data(attr_chain_id);
            var currentLevel = levelSelect.data(attr_level_id);
            log("levelChangedCallback sid:" + currentSID + ", level-id:" + currentLevel + ", currentVal: " + currentSelectedValue);
            var baseLevel = getLevel(currentSID, 0);
            hideLevelsGreaterThan(currentSID, currentLevel);
            if (!currentSelectedValue) {
                baseLevel.data(attr_selected_option, "");
                runUserCallback("");
            } else if ($.isNumeric(currentSelectedValue)) {
                baseLevel.data(attr_selected_option, currentSelectedValue);
                runUserCallback(currentSelectedValue);
            } else {
                baseLevel.data(attr_selected_option, "");
                runUserCallback("");
                var subData = JSON.parse(currentSelectedValue);
                fillLevelData(currentSID, currentLevel + 1, subData);
            }
        };
        getLevel = function (sid, levelNum, createIfNotExists) {
            if (levelNum > options.maxLevels) throw new Error("level " + levelNum + " exceedes options.maxLevels, set to higher if this is required");
            log("getLevel sid: " + sid + ", levelNum:" + levelNum);
            createIfNotExists = (createIfNotExists === undefined) ? true : createIfNotExists;
            if (levels[sid] === undefined) return undefined;
            if (createIfNotExists && levels[sid][levelNum] === undefined) {
                var $newSelect = $("<select></select>").insertAfter(levels[sid][levelNum - 1]);
                $newSelect.data(attr_level_id, levelNum);
                $newSelect.data(attr_chain_id, sid);
                $newSelect.addClass(attr_value_select_class);
                $newSelect.unbind('change');
                $newSelect.change(function () {
                    levelChangedCallback($(this));
                });
                levels[sid][levelNum] = $newSelect;
            }
            return levels[sid][levelNum];
        };
        fillLevelData = function (sid, levelNum, data) {
            hideLevelsGreaterThan(sid, levelNum);
            var $level = getLevel(sid, levelNum);
            $level.empty();
            $level.append(new Option(options.placeholder ? options.placeholder : "", ""));
            if ($.isFunction(data)) {
                data = data();
            }
            if (options.sortByValue) {
                log("sorting", data);
                var sortedKeys = [];
                for (var skey in data) {
                    if (data.hasOwnProperty(skey)) {
                        sortedKeys.push({akey: skey, avalue: data[skey]});
                    } else {
                        log("ignoring key:" + skey + ", on levelnum:" + levelNum + " chain-id:" + sid);
                    }
                }
                sortedKeys.sort(function (a, b) {
                    var acompare, bcompare;
                    acompare = $.isNumeric(a.akey) ? a.avalue : a.akey;
                    bcompare = $.isNumeric(b.akey) ? b.avalue : b.akey;
                    return acompare.localeCompare(bcompare);
                });
                for (key in sortedKeys) {
                    var obj = sortedKeys[key];
                    if ($.isNumeric(obj.akey)) {
                        $opt = $(new Option(obj.avalue, obj.akey));
                        $opt.data(attr_data, obj.akey);
                        $level.append($opt);
                    } else {
                        $opt = $(new Option(obj.akey, obj.akey));
                        $opt.data(attr_data, JSON.stringify(obj.avalue));
                        $level.append($opt);
                    }
                }
            } else {
                for (var key in data) {
                    var $opt;
                    if (!data.hasOwnProperty(key)) {
                        log("ignoring key:" + key + ", on levelNum:" + levelNum + " chain-id:" + sid);
                    } else if (data.hasOwnProperty(key) && $.isNumeric(key)) {
                        $opt = $(new Option(data[key], key));
                        $opt.data(attr_data, key);
                        $level.append($opt);
                    } else if (data.hasOwnProperty(key)) {
                        $opt = $(new Option(key, key));
                        $opt.data(attr_data, JSON.stringify(data[key]));
                        $level.append($opt);
                    }
                }
            }
            $level.show();
        };
        hideLevelsGreaterThan = function (sid, levelNum) {
            log("hideLevelsGreaterThan sid:" + sid + ", levelNum:" + levelNum);
            var levelUp = getLevel(sid, ++levelNum, false);
            while (levelUp !== undefined) {
                levelUp.empty();
                levelUp.hide();
                levelUp = getLevel(sid, ++levelNum, false);
            }
        };
        findPathForKey = function () {
            var findRec = function (object, key, path) {
                var value = undefined;
                var numericSearch = (typeof key === 'number');
                var stringSearch = (typeof key === 'string');
                if (!numericSearch && !stringSearch) {
                    log("findPathForKey: invalid search, neither number or string, key is: " + key + ", typeof " + (typeof key));
                    return undefined;
                }
                Object.keys(object).some(function (k) {
                    if (
                        (numericSearch && (parseInt(k) === parseInt(key))) ||
                        (stringSearch && (String(k) === String(key)))
                    ) {
                        value = path.concat(k);
                        return true;
                    }
                    if (object[k] && typeof object[k] === 'object') {
                        value = findRec(object[k], key, path.concat(k));
                        return value !== undefined;
                    }
                });
                return value;
            };
            var foundVal = findRec(options.data, options.selectedKey, []);
            log("findPathForKey found path: " + foundVal);
            return foundVal;
        };
        openDefaultPath = function (sid) {
            log("openDefaultPath: defaultPath " + options.defaultPath);
            for (var levelNum = 0; levelNum < options.defaultPath.length; levelNum++) {
                var $level = getLevel(sid, levelNum, true);
                $level.val(options.defaultPath[levelNum]);
                levelChangedCallback($level);
            }
        };
        if (options == null) {
            options = {};
        }
        options = $.extend({
            data: {},
            placeholder: false,
            maxLevels: 10,
            loggingEnabled: false,
            selectedKey: false,
            defaultPath: false,
            sortByValue: true,
            onSelectedCallback: false
        }, options);

        return this.each(function () {
            var $select;
            $select = $(this);

            var $id = $select.attr('id');
            if ($id === undefined) {
                $id = generateSID();
            }
            $select.data(attr_level_id, 0);
            $select.data(attr_chain_id, $id);
            $select.addClass(attr_value_select_class);
            $select.unbind('change');
            $select.change(function () {
                levelChangedCallback($(this));
            });
            levels[$id] = [];
            levels[$id][0] = $select;

            fillLevelData($id, 0, options.data);

            if (options.selectedKey !== false) {
                options.defaultPath = findPathForKey();
            }

            if (options.defaultPath instanceof Array) {
                openDefaultPath($id);
            } else {
                $select.trigger('change');
            }

            $($select.closest('form')).submit(function () {
                var selectedVal = $select.data(attr_selected_option);
                $select.append(new Option("Selected", selectedVal));
                $select.val(selectedVal);
            });

            return $select;
        });
    };
})(jQuery);
