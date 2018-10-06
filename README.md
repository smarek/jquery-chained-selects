# Chained Selects
jQuery plugin for populating chained selects using hierarchical javascript (JSON) data

## Sample usage

[Demo can be seen here](https://smarek.github.io/jquery-chained-selects/demo.html)

```html
<form>
  <select id="sample-select"></select>
</form>

<script type="text/javascript">
var chainedData = {
    "A": {
        1: "AA",
        2: "AB"
    },
    B: {
        "BB": {
            3: "BBB"
        }
    }
};

$(document).ready(function () {
    $('#sample-select').chainedSelects({
        data: chainedData,
        loggingEnabled: true
    });
});
</script>
```

## Full options
```javascript
$("#select-id").chainedSelects({
    placeholder: "", // placeholder text, can be left empty, default value is ""
    data: dataVariable, // data, can be function which returns data structure, or plain variable, defaults to `{}`
    maxLevels: 10, // to avoid browser hangs, by default is limited to 10 levels of hierarchy, you can raise this if you need to
    loggingEnabled: false, // enables internal logging, might be useful for debugging, defaults to `false`
});
```


## Notes about usage

- Will not allow you to select parent, only values where key is numeric (in sample selectable only 1(AA), 2(AB) and 3(BBB)
- Currently does not allow to pre-select option, for will always appear in default state
- Will bind to form surrounding the target select, and before form submit, place dummy option with selected value to the target select
