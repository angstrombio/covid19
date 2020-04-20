/**
 * Functions for handling the timeline control and "playing" the timeline.
 */

ANIMATION_PLAYING = false;
ANIMATION_TIMER = null;

/**
 * Retrieves the current selection of the history range control.
 */
function getHistoryRangeValue() {
    return d3.select("#history-range").property('value');
}

/**
 * Sets a value for the history range control.
 *
 * @param newValue      The new value to set.
 * @param refreshMap    If true, refreshes the map display.
 */
function setHistoryRangeValue(newValue, refreshMap) {
    d3.select("#history-range").property('value', newValue);
    updateTimelineLabel();
    if (refreshMap) {
        updateMap();
    }
}

/**
 * Starts the timeline animation.
 */
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

/**
 * Updates the timeline for each step of the timer.
 */
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

/**
 * Defines the timeline range.
 */
function setTimelineRange(min, max) {
    d3.select("#history-range")
        .attr('min', min)
        .attr('max', max)
        .property('value', max);
    updateTimelineLabel();
}

/**
 * Retrieves the max value for the history range control.
 */
function getHistoryRangeMax() {
    return d3.select("#history-range").attr('max');
}

/**
 * Updates the timeline label based on the history range control.
 */
function updateTimelineLabel() {
    let max = getHistoryRangeMax();
    let value = getHistoryRangeValue();
    let historyLabel;
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

