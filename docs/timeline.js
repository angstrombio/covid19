ANIMATION_PLAYING = false;
ANIMATION_TIMER = null;

function getHistoryRangeValue() {
    return d3.select("#history-range").property('value');
}

function setHistoryRangeValue(newValue, refreshMap) {
    d3.select("#history-range").property('value', newValue);
    updateTimelineLabel();
    if (refreshMap) {
        updateMap();
    }
}

function triggerTimelineAnimation() {
    d3.select("#play-button-icon").classed("fa-pause", !ANIMATION_PLAYING).classed("fa-play", ANIMATION_PLAYING);
    if (ANIMATION_PLAYING) {
        clearInterval(ANIMATION_TIMER);
    } else {
        setHistoryRangeValue(0, true);
        ANIMATION_TIMER = setInterval(historyRangeTimerStep, 900);
    }
    ANIMATION_PLAYING = !ANIMATION_PLAYING;
}

function historyRangeTimerStep() {
    let max = getHistoryRangeMax();
    let value = getHistoryRangeValue();
    value++;
    if (value > max) {
        triggerTimelineAnimation();
    } else {
        setHistoryRangeValue(value, true);
    }
}

function setTimelineRange(min, max) {
    d3.select("#history-range")
        .attr('min', min)
        .attr('max', max)
        .property('value', max);
    updateTimelineLabel();
}

function getHistoryRangeMax() {
    return max = d3.select("#history-range").attr('max');
}

function updateTimelineLabel() {
    let max = getHistoryRangeMax();
    let value = getHistoryRangeValue();
    if (value == max) {
        MapOptions.historyIndex = -1;
        historyLabel = MapOptions.lastUpdateDate;
    } else {
        MapOptions.historyIndex = max - value - 1;
        historyLabel = MapOptions.dateHistory[MapOptions.historyIndex];
    }
    if (historyLabel == null) {
        historyLabel = '';
    }
    d3.select('#history-range-label').html(historyLabel);
}

