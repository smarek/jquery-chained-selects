;(function ($, window, document, undefined) {

    "use strict";

    let defaults = {
        data: {},
        placeholder: false,
        maxLevels: 10,
        loggingEnabled: false,
        selectedKey: false,
        defaultPath: false,
        sortByValue: false,
        onSelectedCallback: false,
        selectCssClass: false,
        autoSelectSingleOptions: false
    };

    function ChainedSelect(element, options) {
        this.element = $(element);
        this.options = $.extend({}, defaults, options);
        this.init();
    }

    $.extend(ChainedSelect.prototype, {
        // constants
        attr_chain_id: 'chain-id', attr_level_id: 'level-id', attr_data: 'next-level-data',
        attr_selected_option: 'selected-option',
        attr_value_select_class: 'chained-select',
        levels: [],
        chain_id: undefined,
        // functions
        randomString(length, chars) {
            let result = '';
            for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
            return result;
        },
        generateSID() {
            return this.randomString(8, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        },
        log(data) {
            if (this.options.loggingEnabled && console !== undefined) {
                console.log("[ChainedSelects] " + data);
            }
        },
        levelChangedCallback(levelSelect) {
            let currentSelectedValue = levelSelect.find(':selected').data(this.attr_data);
            let currentSID = levelSelect.data(this.attr_chain_id);
            let currentLevel = levelSelect.data(this.attr_level_id);
            this.log("levelChangedCallback sid:" + currentSID + ", level-id:" + currentLevel + ", currentVal: " + currentSelectedValue);
            let baseLevel = this.getLevel(currentSID, 0);
            this.hideLevelsGreaterThan(currentSID, currentLevel);
            if (!currentSelectedValue) {
                baseLevel.data(this.attr_selected_option, "");
                this.runUserCallback("");
            } else if ($.isNumeric(currentSelectedValue)) {
                baseLevel.data(this.attr_selected_option, currentSelectedValue);
                this.runUserCallback(currentSelectedValue);
            } else {
                baseLevel.data(this.attr_selected_option, "");
                this.runUserCallback("");
                let subData = JSON.parse(currentSelectedValue);
                this.fillLevelData(currentSID, currentLevel + 1, subData);
            }
        },
        runUserCallback(data) {
            try {
                if (this.options.onSelectedCallback !== false) {
                    this.options.onSelectedCallback(data);
                }
            } catch (e) {
                this.log(e);
            }
        },
        getLevel(sid, levelNum, createIfNotExists) {
            if (levelNum > this.options.maxLevels) throw new Error("level " + levelNum + " exceedes options.maxLevels, set to higher if this is required");
            this.log("getLevel sid: " + sid + ", levelNum:" + levelNum);
            createIfNotExists = (createIfNotExists === undefined) ? true : createIfNotExists;
            if (this.levels[sid] === undefined) return undefined;
            if (createIfNotExists && this.levels[sid][levelNum] === undefined) {
                let $newSelect = $("<select></select>").insertAfter(this.levels[sid][levelNum - 1]);
                $newSelect.data(this.attr_level_id, levelNum);
                $newSelect.data(this.attr_chain_id, sid);
                $newSelect.addClass(this.attr_value_select_class);
                $newSelect.addClass(this.options.selectCssClass);
                $newSelect.unbind('change');
                $newSelect.change(() => this.levelChangedCallback($newSelect));
                this.levels[sid][levelNum] = $newSelect;
            }
            return this.levels[sid][levelNum];
        },
        fillLevelData(sid, levelNum, data) {
            this.hideLevelsGreaterThan(sid, levelNum);
            let $level = this.getLevel(sid, levelNum);
            $level.empty();
            if (this.options.placeholder) {
                $level.append(new Option(this.options.placeholder ? this.options.placeholder : "", ""));
            }
            if ($.isFunction(data)) {
                data = data();
            }
            if (this.options.sortByValue) {
                this.log("sorting", data);
                let sortedKeys = [];
                for (let skey in data) {
                    if (data.hasOwnProperty(skey)) {
                        sortedKeys.push({akey: skey, avalue: data[skey]});
                    } else {
                        this.log("ignoring key:" + skey + ", on levelnum:" + levelNum + " chain-id:" + sid);
                    }
                }
                sortedKeys.sort(function (a, b) {
                    let acompare, bcompare;
                    acompare = $.isNumeric(a.akey) ? a.avalue : a.akey;
                    bcompare = $.isNumeric(b.akey) ? b.avalue : b.akey;
                    return acompare.localeCompare(bcompare);
                });
                for (let key in sortedKeys) {
                    let obj = sortedKeys[key];
                    if ($.isNumeric(obj.akey)) {
                        let $opt = $(new Option(obj.avalue, obj.akey));
                        $opt.data(this.attr_data, obj.akey);
                        $level.append($opt);
                    } else {
                        let $opt = $(new Option(obj.akey, obj.akey));
                        $opt.data(this.attr_data, JSON.stringify(obj.avalue));
                        $level.append($opt);
                    }
                }
            } else {
                for (let key in data) {
                    let $opt;
                    if (!data.hasOwnProperty(key)) {
                        this.log("ignoring key:" + key + ", on levelNum:" + levelNum + " chain-id:" + sid);
                    } else if (data.hasOwnProperty(key) && $.isNumeric(key)) {
                        $opt = $(new Option(data[key], key));
                        $opt.data(this.attr_data, key);
                        $level.append($opt);
                    } else if (data.hasOwnProperty(key)) {
                        $opt = $(new Option(key, key));
                        $opt.data(this.attr_data, JSON.stringify(data[key]));
                        $level.append($opt);
                    }
                }
            }
            if (this.options.autoSelectSingleOptions === true) {
                let childrenCount = $level.children().length;
                if ((this.options.placeholder && childrenCount === 2) || (childrenCount === 1)) {
                    $level.children().last().attr('selected', 'selected');
                }
            }
            $level.trigger('change');
            $level.show();
        },
        hideLevelsGreaterThan(sid, levelNum) {
            this.log("hideLevelsGreaterThan sid:" + sid + ", levelNum:" + levelNum);
            let levelUp = this.getLevel(sid, ++levelNum, false);
            while (levelUp !== undefined) {
                levelUp.empty();
                levelUp.hide();
                levelUp = this.getLevel(sid, ++levelNum, false);
            }
        },
        findPathForKey() {
            let findRec = function (object, key, path, logFunction) {
                let value = undefined;
                let numericSearch = (typeof key === 'number');
                let stringSearch = (typeof key === 'string');
                if (!numericSearch && !stringSearch && logFunction) {
                    logFunction("findPathForKey: invalid search, neither number or string, key is: " + key + ", typeof " + (typeof key));
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
                        value = findRec(object[k], key, path.concat(k), logFunction);
                        return value !== undefined;
                    }
                });
                return value;
            };
            let foundVal = findRec(this.options.data, this.options.selectedKey, [], this.log);
            this.log("findPathForKey found path: " + foundVal);
            return foundVal;
        },
        openDefaultPath(sid) {
            this.log("openDefaultPath: defaultPath " + this.options.defaultPath);
            if (this.options.defaultPath instanceof Array) {
                for (let levelNum = 0; levelNum < this.options.defaultPath.length; levelNum++) {
                    let $level = this.getLevel(sid, levelNum, true);
                    $level.val(this.options.defaultPath[levelNum]);
                    this.levelChangedCallback($level);
                }
            }
        },
        init() {
            let $select = this.element;

            let $id = $select.attr('id');
            if ($id === undefined) {
                $id = this.generateSID();
            }
            this.chain_id = $id;

            $select.data(this.attr_level_id, 0);
            $select.data(this.attr_chain_id, $id);
            $select.addClass(this.attr_value_select_class);
            $select.addClass(this.options.selectCssClass);
            $select.unbind('change');
            $select.change(() => this.levelChangedCallback($select));
            this.levels[$id] = [];
            this.levels[$id][0] = $select;

            this.fillLevelData($id, 0, this.options.data);

            if (this.options.selectedKey !== false) {
                this.options.defaultPath = this.findPathForKey();
            }

            if (this.options.defaultPath instanceof Array) {
                this.openDefaultPath($id);
            } else {
                $select.trigger('change');
            }

            $select.closest('form').submit(() => {
                let selectedVal = $select.data(this.attr_selected_option);
                $select.append(new Option("Selected", selectedVal));
                $select.val(selectedVal);
            });

        },
        // api
        setLoggingEnabled(enabled) {
            let argsCorrect = (typeof enabled === "boolean");
            enabled = argsCorrect ? enabled : true;
            this.options.loggingEnabled = enabled;
            return argsCorrect;
        },
        changeSelectedKey(newKey) {
            this.options.selectedKey = newKey;
            this.options.defaultPath = this.findPathForKey();
            this.openDefaultPath(this.chain_id);
        }
    });

    $.fn.chainedSelects = function (options) {
        return this.each(function () {
            if (!$.data(this, "chainedSelects")) {
                $.data(this, "chainedSelects", new ChainedSelect(this, options));
            }
        });
    }
})(jQuery, window, document);
